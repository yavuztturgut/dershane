# Frontend Architecture

## Stack

- React + Vite + JavaScript
- Mantine UI for accessible components, modals, forms, notifications and loaders
- Tailwind CSS for responsive layout utilities; no inline `style` or Mantine `sx` props
- React Router, TanStack Query, Axios, FullCalendar and react-i18next
- Vitest and React Testing Library

## Folder Rules

- Keep API calls, query hooks, forms and pages inside their feature: `features/users`, `features/schedules`, and so on. Domain mutations must not live in `components/ui`.
- Reusable visual primitives belong in `components/ui`; app shell and page-container code belongs in `components/layout`. Each named React component uses `ComponentName/ComponentName.jsx`, with matching colocated CSS modules and component tests when present.
- Use `shared/api/api-client.js` for API requests. Query, time and notification infrastructure lives in its named `shared/` area; do not create second Axios instances inside features.
- Keep shared application wiring in `app/` and translations in `locales/`.

## Authentication

- JWT is stored only in the `access_token` HttpOnly cookie; never use localStorage for tokens.
- Axios uses `withCredentials: true`; the logged-in user comes from `GET /api/auth/profile`.
- Redirect unauthenticated users to `/login`. Admin-only pages must also use a role guard.

## UI Rules

- Desktop uses a collapsible left sidebar. Mobile uses a Drawer sidebar.
- English and Turkish are supported with `react-i18next`; persist the language in localStorage.
- Theme options are light, dark and system; Mantine persists the color preference.
- Use Mantine Loader for application startup, queries and mutation buttons. Never leave a loading region empty.
- Wrap the router with the global ErrorBoundary. Render failures must show the recovery screen instead of a blank page.
- Use a confirmation modal before every DELETE mutation.
- Prefer responsive grids and semantic Mantine components. Use pixels only when a component API requires a fixed value.
- `app/theme.js` is the source of truth for the primary blue, typography, radii, spacing, shadows and shared control defaults.
- Use named `components/ui` surfaces, page headers, stat cards, responsive lists and record cards. Generic `patterns` or `helpers` stores are forbidden.
- Page content is centered and width-limited; schedule and data-heavy views may use the wider page container.
- List pages use tables from the `sm` breakpoint upward and cards below it. Search remains visible on mobile while secondary filters collapse behind a filter button with an active count.
- Light and dark modes preserve the same hierarchy through Mantine tokens and color-scheme selectors; do not duplicate colors in JSX.
- Touch targets are at least `2.75rem`. Keep focus rings visible and disable non-essential animation under `prefers-reduced-motion`.
- CSS measurements use relative units, layout primitives or theme tokens. FullCalendar numeric JavaScript options are the pixel exception because its API requires unitless fixed numbers.
- The architecture test rejects JSX `style`, `styles` and `sx` props and pixel units in authored CSS.

## Data and Roles

- React Query owns API cache and invalidates related list queries after mutations.
- Admin can use all CRUD features and sees the dashboard.
- Teacher and student can only access their schedule and profile. The backend applies the schedule filter.
- Schedules are rendered with FullCalendar. Desktop/tablet defaults to Week, mobile defaults to Day, and the visible timetable is 08:00-22:00 in 30-minute slots.
- Route pages are lazy-loaded. Keep FullCalendar and date-heavy attendance code outside the initial application bundle.
- User list search, filters and pagination live in the URL and are executed by the backend. Schedule queries always include the visible calendar range.
- Admin can select a time interval to create and click an event to edit or delete it. Course, class and teacher filters are sent with the visible calendar range and executed by the backend.
- Schedule event colors are deterministic by course. Event blocks show course, class and teacher without letting text overflow.

## Tests

- Test forms, role guards, sidebar role visibility, delete confirmation and schedule time selection with Vitest and React Testing Library.
- Password recovery uses one-time email tokens. Profile and password changes update the auth query cache; password changes invalidate existing sessions.
- Teachers take attendance from their schedule event, students see their own history, and admins use the attendance report page.
- Architecture rules live in `frontend/tests/architecture`; component and unit tests stay beside their source files.
