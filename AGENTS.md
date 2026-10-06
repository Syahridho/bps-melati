# Repository Guidelines

## Tech Stack
- **Backend**: PHP 8.2+ / Laravel 12 with SQLite (dev) and Redis (caching & locks).
- **Frontend**: Inertia v2 + React 19 (TypeScript), Vite 6, Tailwind CSS v4, Radix UI.
- **Realtime**: Laravel Reverb + Laravel Echo (`@laravel/echo-react`).

## Developer Commands
- **Full Dev Server**: `composer dev` (runs `serve`, `queue:listen`, `reverb:start`, and Vite concurrently).
- **Tests**: `vendor/bin/pest` or `php artisan test --compact`. Run target file: `vendor/bin/pest tests/Feature/Admin/InputDataTest.php`.
- **Formatting & Linting**:
  - PHP: `vendor/bin/pint --dirty --format agent`
  - Frontend: `npm run format` (Prettier) & `npm run lint` (ESLint `--fix`).
- **Asset Build**: `npm run build`.

## Architecture & System Quirks
- **Roles & Routes**: Defined via `UserRole` enum (`admin`, `operator`). Public registration is disabled.
  - Admin routes: `/dashboard/admin/*` (`role:admin` middleware).
  - Operator routes: `/dashboard/operator/*` (`role:operator` middleware).
  - Base `/dashboard` redirects based on authenticated user's role.
- **API Authentication**: `/api/*` routes use `api.key` middleware (`EnsureApiKeyIsValid`). Expects `X-API-KEY` or `Authorization: Bearer <key>` matching `config('app.api_key')`.
- **Ticket Generation**: Format `PREFIX-CODE/MMYYYY/RAND2_LETTERS+SEQUENCE` (e.g., `L-1400/102026/AB01`).
  - Prefixes: `L` (Pengaduan), `A` (Aspirasi), `I` (Permintaan Informasi). Code is `1400`.
  - Atomic sequence increments use Redis lock `ticket_counter:{period}`.
- **Caching Strategy**:
  - Recap reports use `RekapCache::invalidate()` to update the version token `rekap:version`.
  - Dashboard stats rely on `dashboard:admin:version`, automatically incremented via `saved` and `deleted` model events on `Ticket`.
- **Scheduled Auto-Close**: `php artisan tickets:auto-close` (scheduled hourly in `routes/console.php`) closes inactive tickets based on thresholds in `settings` (`auto_close_*_days`).
