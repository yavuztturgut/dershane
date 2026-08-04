# Backend Architecture

## Stack

- Node.js + Express + CommonJS
- PostgreSQL through `pg`; use parameterized SQL in repositories
- JWT authentication, bcrypt password hashing, cookie-parser and CORS
- Nodemailer for password-reset email delivery
- Node's built-in test runner

## Folder Rules

- Keep each domain inside `components/<feature>`: `auth`, `users`, `roles`, `classes`, `courses`, `schedules`, `attendance` and `dashboard`.
- Follow the dependency flow `route -> controller -> service -> repository`. Do not access PostgreSQL from routes or controllers.
- Routes define endpoint paths and middleware order. Controllers translate HTTP input and service output without owning business rules.
- Services own validation, authorization-sensitive domain rules and response shaping. Repositories own SQL and database transactions.
- Keep cross-cutting HTTP middleware in `middlewares/`, shared utilities in `utils/`, and database setup and migrations in `db/`.

## Application and Errors

- `server.js` loads environment variables and starts the HTTP server. `app.js` configures CORS, cookies, JSON parsing, `/api` routers and the final error middleware.
- Allow credentials only from `CLIENT_URL`, defaulting to `http://localhost:5173` in development.
- Wrap asynchronous controllers with `asyncHandler`; forward failures to the centralized error middleware.
- Create expected failures with `createHttpError`. API error responses use `{ error, errorCode }` and may include `details` for structured context.
- Translate PostgreSQL unique, foreign-key and check-constraint failures into stable `400` or `409` responses. Unexpected failures return `500 INTERNAL_ERROR` without exposing internals.

## Authentication and Authorization

- Store JWTs only in the `access_token` HttpOnly cookie. The cookie is secure in production, uses the configured `COOKIE_SAME_SITE` value and expires after one day.
- Authenticate each protected request by verifying the JWT and reloading the user's current role, active state, class and `token_version` from PostgreSQL.
- Support only the fixed `admin`, `teacher` and `student` roles. Use `authMiddleware` before `requireRole`; service-level ownership checks still apply where access depends on a specific record.
- Hash passwords with bcrypt and require at least eight characters for new or changed passwords. Increment `token_version` after password changes or resets to invalidate existing sessions.
- Keep password-reset tokens single-use, store only their SHA-256 hashes and expire them after 30 minutes. Forgot-password responses must not reveal whether an account exists.
- Apply in-memory rate limits to login and password-reset endpoints. This implementation is process-local and must not be treated as a distributed rate limiter.

## Data and Domain Rules

- Users are managed by admins. Students must belong to a class; inactive users and unsupported roles cannot authenticate.
- System roles are readable by admins but cannot be created, updated or deleted. Classes and courses are readable by authenticated users and writable only by admins.
- Admins can see and mutate all schedules. Teachers see only schedules assigned to them; students see only schedules for their class.
- Schedule range filters use overlap semantics. Reject invalid time ranges, inactive or non-teacher assignees, and lessons that overlap for either the teacher or the class. Adjacent lessons are allowed.
- Teachers can view or record attendance only for their own lessons, from the lesson start until 24 hours after its end. Admins can edit after that lock; students can view only their own completed-lesson history.
- Attendance statuses are `present`, `absent`, `late` and `excused`. Records are unique per schedule and student, and saves must reject students outside the scheduled class.
- User and attendance reports paginate in the service layer with bounded page sizes. Dashboard summaries and attendance reports are admin-only.

## Database

- Use the shared pool from `db/pool.js`. Keep SQL parameterized and return only fields required by the service or API.
- Use explicit transactions for multi-row or multi-step atomic operations, including attendance upserts and password-reset token consumption.
- Use `db/create.sql` for a fresh database. Apply later changes with `npm run migrate`; migration files run in filename order and are recorded in `schema_migrations`.
- Preserve database constraints for normalized class and course names, schedule time ordering, foreign-key integrity, attendance status values and one attendance record per student per schedule.

## Tests

- Run backend tests with `npm test` using Node's built-in test runner.
- Test service validation and role or ownership boundaries without moving business rules into controllers.
- Cover user pagination and student-class requirements, unsupported auth roles, reset-token behavior, reset-email localization and escaping, and rate limiting.
- Cover schedule conflicts and adjacency, attendance ownership and lock windows, admin overrides, filtering, pagination and daily report grouping.
