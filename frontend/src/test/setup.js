import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

// Register the DOM matchers against Vitest's local expect instance in every
// worker. Relying on the package side-effect made parallel Windows runs
// intermittently start without matchers such as `toBeInTheDocument`.
expect.extend(matchers);
import i18n from '../app/i18n';

i18n.changeLanguage('en');

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;
Element.prototype.scrollIntoView = () => {};
