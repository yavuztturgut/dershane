import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from './i18n';
import { RouteMetadata } from './route-metadata';

describe('RouteMetadata', () => {
  afterEach(() => i18n.changeLanguage('en'));

  it('uses the localized title for the current route and reacts to language changes', async () => {
    await i18n.changeLanguage('tr');
    render(<MemoryRouter initialEntries={['/schedules']}><RouteMetadata /></MemoryRouter>);

    await waitFor(() => expect(document.title).toBe('Dershane | Ders Programı'));
    expect(document.documentElement.lang).toBe('tr');

    await i18n.changeLanguage('en');
    await waitFor(() => expect(document.title).toBe('Academy | Schedules'));
    expect(document.documentElement.lang).toBe('en');
  });
});
