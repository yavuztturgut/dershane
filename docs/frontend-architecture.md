# Frontend Architecture

## Stack

- React + Vite + JavaScript
- Mantine UI for accessible components, modals, forms, notifications and loaders
- Tailwind CSS for responsive layout utilities; no inline `style` or Mantine `sx` props
- React Router, TanStack Query, Axios, FullCalendar and react-i18next
- Vitest and React Testing Library

## Folder Rules

- Keep API calls, query hooks, forms and pages inside their feature: `features/users`, `features/schedules`, and so on.
- Reusable visual primitives belong in `components/ui`; app shell code belongs in `components/layout`.
- Use `lib/api-client.js` for API requests. Do not create second Axios instances inside features.
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

## Data and Roles

- React Query owns API cache and invalidates related list queries after mutations.
- Admin can use all CRUD features and sees the dashboard.
- Teacher and student can only access their schedule and profile. The backend applies the schedule filter.
- Schedules are rendered with FullCalendar. Desktop/tablet defaults to Week, mobile defaults to Day, and the visible timetable is 08:00-22:00 in 30-minute slots.
- Route pages are lazy-loaded. Keep FullCalendar and date-heavy attendance code outside the initial application bundle.
- User list search, filters and pagination live in the URL and are executed by the backend. Schedule queries always include the visible calendar range.
- Admin can select a time interval to create and click an event to edit or delete it. Course, class and teacher filters run client-side against the fetched schedule list.
- Schedule event colors are deterministic by course. Event blocks show course, class and teacher without letting text overflow.

## Tests

- Test forms, role guards, sidebar role visibility, delete confirmation and schedule time selection with Vitest and React Testing Library.
- Password recovery uses one-time email tokens. Profile and password changes update the auth query cache; password changes invalidate existing sessions.
- Teachers take attendance from their schedule event, students see their own history, and admins use the attendance report page.
