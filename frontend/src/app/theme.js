import { createTheme, rem } from '@mantine/core';

export const appTheme = createTheme({
  primaryColor: 'blue',
  primaryShade: { light: 6, dark: 5 },
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: '700' },
  defaultRadius: 'md',
  cursorType: 'pointer',
  focusRing: 'auto',
  spacing: {
    xs: rem('8'),
    sm: rem('12'),
    md: rem('16'),
    lg: rem('24'),
    xl: rem('32'),
  },
  shadows: {
    xs: '0 0.0625rem 0.125rem rgb(15 23 42 / 0.05)',
    sm: '0 0.125rem 0.5rem rgb(15 23 42 / 0.07)',
    md: '0 0.75rem 2rem rgb(15 23 42 / 0.1)',
  },
  components: {
    Button: { defaultProps: { radius: 'md' } },
    ActionIcon: { defaultProps: { radius: 'md', size: 'lg' } },
    TextInput: { defaultProps: { radius: 'md', size: 'md' } },
    PasswordInput: { defaultProps: { radius: 'md', size: 'md' } },
    Select: { defaultProps: { radius: 'md', size: 'md' } },
    Paper: { defaultProps: { radius: 'lg' } },
  },
});
