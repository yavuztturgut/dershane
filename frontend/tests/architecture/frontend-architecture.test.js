import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = join(process.cwd(), 'src');

function sourceFiles(directory = sourceRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : ['.js', '.jsx', '.css'].includes(extname(path)) ? [path] : [];
  });
}

describe('frontend architecture rules', () => {
  it('keeps named React components in matching PascalCase folders', () => {
    const roots = [join(sourceRoot, 'components'), join(sourceRoot, 'features')];
    const violations = roots.flatMap((root) => sourceFiles(root))
      .filter((file) => /[A-Z][A-Za-z0-9]+\.jsx$/.test(file))
      .filter((file) => basename(dirname(file)) !== basename(file, '.jsx'))
      .map((file) => relative(sourceRoot, file));
    expect(violations).toEqual([]);
  });

  it('keeps component CSS modules and tests beside their component with matching names', () => {
    const roots = [join(sourceRoot, 'components'), join(sourceRoot, 'features')];
    const violations = roots.flatMap((root) => sourceFiles(root)).filter((file) => /(?:\.module\.css|\.test\.jsx)$/.test(file)).filter((file) => {
      const componentName = basename(file).replace(/\.(?:module\.css|test\.jsx)$/, '');
      return basename(dirname(file)) !== componentName;
    }).map((file) => relative(sourceRoot, file));
    expect(violations).toEqual([]);
  });

  it('does not create generic patterns or helpers stores', () => {
    const violations = sourceFiles().filter((file) => /(?:^|[\\/])(?:patterns|helpers)(?:\.|[\\/])/i.test(file))
      .map((file) => relative(sourceRoot, file));
    expect(violations).toEqual([]);
  });

  it('routes notification creation through the shared notification manager', () => {
    const manager = join(sourceRoot, 'shared', 'notifications', 'notifications.js');
    const violations = sourceFiles().filter((file) => /\.(?:js|jsx)$/.test(file) && file !== manager)
      .filter((file) => /\bnotifications\.show\s*\(/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(sourceRoot, file));
    expect(violations).toEqual([]);
  });

  it('keeps attendance status styles inside the attendance feature', () => {
    const violations = sourceFiles().filter((file) => /\.css$/.test(file) && !file.includes(`${sep}features${sep}attendance${sep}`))
      .filter((file) => /status(?:Select|Option)|data-status/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(sourceRoot, file));
    expect(violations).toEqual([]);
  });

  it('does not introduce cyclic dependencies between features', () => {
    const featureRoot = join(sourceRoot, 'features');
    const graph = new Map(readdirSync(featureRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => [entry.name, new Set()]));
    for (const [feature] of graph) {
      for (const file of sourceFiles(join(featureRoot, feature)).filter((value) => /\.(?:js|jsx)$/.test(value))) {
        const imports = readFileSync(file, 'utf8').matchAll(/(?:from\s+|import\s*\()['"](\.{1,2}\/[^'"]+)['"]/g);
        for (const match of imports) {
          const target = resolve(dirname(file), match[1]);
          const targetRelative = relative(featureRoot, target).split(sep);
          if (targetRelative.length > 1 && graph.has(targetRelative[0]) && targetRelative[0] !== feature) graph.get(feature).add(targetRelative[0]);
        }
      }
    }
    const cycles = [];
    const visit = (feature, path = []) => {
      if (path.includes(feature)) { cycles.push([...path.slice(path.indexOf(feature)), feature].join(' -> ')); return; }
      for (const dependency of graph.get(feature) || []) visit(dependency, [...path, feature]);
    };
    for (const feature of graph.keys()) visit(feature);
    expect([...new Set(cycles)]).toEqual([]);
  });

  it('keeps presentation out of JSX inline style APIs', () => {
    const violations = sourceFiles().filter((path) => /\.jsx$/.test(path)).flatMap((path) => {
      const matches = readFileSync(path, 'utf8').match(/\b(?:style|styles|sx)\s*=/g) || [];
      return matches.map((match) => `${relative(sourceRoot, path)}: ${match}`);
    });
    expect(violations).toEqual([]);
  });

  it('uses relative CSS units instead of pixels', () => {
    const violations = sourceFiles().filter((path) => /\.css$/.test(path)).flatMap((path) => {
      const matches = readFileSync(path, 'utf8').match(/\b\d+(?:\.\d+)?px\b/g) || [];
      return matches.map((match) => `${relative(sourceRoot, path)}: ${match}`);
    });
    expect(violations).toEqual([]);
  });

  it('does not force oversized FullCalendar time slots or duplicate header padding', () => {
    const css = readFileSync(join(sourceRoot, 'index.css'), 'utf8');
    expect(css).not.toMatch(/\.fc\s+\.fc-timegrid-slot\s*{[^}]*height/);
    expect(css).not.toMatch(/\.fc\s+\.fc-col-header-cell\s*{[^}]*padding/);
  });
});
