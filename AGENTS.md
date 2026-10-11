# AGENTS.md

## Project: Melati — Layanan Aspirasi & Pengaduan Online (BPS)

Complaint/aspiration ticket system for Badan Pusat Statistik, modeled on SP4N-LAPOR! (LAPOR!). Public reporters submit tickets, track and reply to them by ticket number; BPS staff triage an inbox, respond officially, and produce monthly/semester/yearly recap tables. A JSON API mirrors the public flows for a Flutter/Android client.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Laravel **12**, PHP ^8.2, Redis (predis), Laravel Reverb, Sanctum 4, Ziggy |
| Frontend | Inertia **v2** + React **19**, Vite 6, Tailwind **v4** (CSS-first), shadcn/ui, Sonner, Recharts |
| Tests | Pest v3 (PHP only — no JS test runner) |
| Formatting | Laravel Pint (PHP), Prettier + Tailwind/Organize-Imports plugins (TS) |

Installed versions worth pinning in your head: `laravel/framework` 12.69, `inertia-laravel` 2.0.27, `reverb` 1.12, `react` 19.0.0, `tailwindcss` 4.0.8, `@inertiajs/react` 2.0.3, `vite` 6.1.1.

### Commands

```bash
composer dev                     # serve + queue:listen + reverb:start + vite, concurrently
php artisan serve                # individually
npm run dev                      # vite only

php artisan test                 # Pest (requires MySQL db `melati_bps_test`)
php artisan test tests/Feature/Admin/TicketResponseTest.php
php artisan test --filter="no status downgrade"
vendor/bin/pint                  # PHP formatter (CI runs this)

npm run format                   # prettier --write resources/  (also sorts Tailwind classes + organizes imports)
npm run lint                     # eslint . --fix
npm run build

# scheduler (wajib untuk auth:prune-logs + sessions:cleanup)
php artisan schedule:work
```

CI (`.github/workflows/lint.yml`, on push/PR to `main`/`develop`) runs `vendor/bin/pint`, `npm run format`, `npm run lint`. **There is no test job in CI** — run Pest yourself before claiming green.

---

## Commands & Environment Gotchas

1. **Tests need a live MySQL database.** `phpunit.xml` forces `DB_CONNECTION=mysql`, `DB_DATABASE=melati_bps_test`, `DB_USERNAME=root`, `DB_PASSWORD=""`. Create it before running the suite; SQLite will not work.
2. **`.env` has `APP_TIMEZONE=UTC`** while `.env.example` and `config/app.php` default to `Asia/Jakarta`. Migration `2026_10_01_000001_adjust_timestamps_to_wib.php` shifted existing rows +7h so DB rows read as WIB. Verify before writing date filters.
3. **`.env.example` is stale** (sqlite, `BROADCAST_CONNECTION=log`, `APP_NAME=Laravel`). The real `.env` uses mysql / redis / reverb / `APP_NAME=Melati`. Trust `.env`.
4. `resources/js/ssr.jsx` and `vite build:ssr` exist but **no route calls `Inertia::ssr()`** — SSR is dead code.
5. `motion` and `next-themes` are installed but never imported. Appearance is hand-rolled (`localStorage` + `.dark` class). Don't reach for them.
6. **`MySQL menolak STORED generated column yang mereferensikan kolom FK` (errno 1215).** `ticket_responses.respon_awal_ticket_id` karena itu memakai `virtualAs()`, bukan `storedAs()`. Jangan diubah ke STORED.
7. **`Broadcast::purge()` menghapus kanal yang terdaftar.** Kalau test mengganti `broadcasting.default`,Ia harus `require base_path('routes/channels.php')` lagi, kalau tidak semua callback kanal jadi 403.
8. **`useForm<T>` dari `@inertiajs/react` mensyaratkan `T extends Record<string, FormDataConvertible>`.** Interface eksplisit tanpa index signature tidak bisa dipakai sebagai generic — biarkan TypeScript menginfer dari object literal, atau tambahkan `& Record<string, string>`.
9. **Test HTTP Laravel tidak meneruskan cookie antar request, dan `postJson()` bahkan mengabaikan `defaultCookies` sepenuhnya.** Untuk menguji kebijakan sesi, helper di `tests/Feature/Auth/SingleSessionTest.php` doing: `carrySession()` (ambil `getCookie()->getValue()` — `getCookie()` mengembalikan objek `Cookie` yang `__toString`-nya `nama=nilai`, bukan nilainya), `Auth::forgetGuards()` (guard di-cache antar request), dan `switchBrowser()` (`flushSession()` + cookie acak).
10. **`actingAs()` tidak menyetel session id.** Setiap request mendapat session id baru, sehingga middleware berbasis sesi akan menganggapnya "sesi lain". `EnsureSingleSession` sengaja dilewati bila autentikasi tidak berasal dari session (`$request->session()->has($guard->getName()) === false`); di produksi guard `web` selalu membaca dari session, jadi Anchorage tetap berlaku.

---

## Domain Model

```
User (admin|operator) ──created_by──▶ Ticket ──▶ TicketResponse ──▶ ResponseAttachment
                                         │              └── user_id NULL ⇒ reporter
                                         ├──▶ TicketAttachment
                                         └──▶ Channel (self-referencing tree)
TicketCounter  (period YYYY-MM unique, shared sequence)
Setting        (key/value, Redis-cached 30d)
```

### Enumerations — never translate or "normalize" these

These snake_case Indonesian values are stored in the DB, sent over Reverb, and consumed by React and the API client. They are a contract.

- `classification`: `pengaduan` | `aspirasi` | `permintaan_informasi`
- `status`: `baru` → `respon_awal` → `respon_substantif` → `selesai` (**monotonic**, see `App\Actions\ReplyToTicket::STATUS_RANK`)
- `TicketResponse.type`: `respon_awal` | `respon_substantif` | `balasan_pelapor`
- `service_type`: `pst` | `lainnya` (pengaduan only, required when channel ≠ website)
- `source_app`: `web` | `flutter` | `android` | `admin`
- `SessionTerminated::REASON_*` / `session_policy`: `taken_over` | `forced_logout` | `deactivated` | `password_changed`
- `App\UserRole`: `admin` | `operator` (the only enum; namespace root, **not** `app/Enums/`)

### Concurrency columns (added for realtime reply safety)

| Column | Meaning |
|---|---|
| `tickets.version` | Incremented on every reply/status change. Sent to the frontend and echoed back as `expected_version` (telemetry only — a stale value never blocks a `respon_substantif`). |
| `ticket_responses.idempotency_key` | UUID v4 minted by the frontend when the reply form opens. Unique per `(ticket_id, idempotency_key)` → double submit / network retry replays instead of duplicating. |
| `ticket_responses.respon_awal_ticket_id` | **Virtual** generated column = `IF(type='respon_awal', ticket_id, NULL)` with a unique index. MySQL ignores NULLs in unique indexes, so `respon_substantif` / `balasan_pelapor` are unaffected. This is the DB-level "one respon awal per ticket" guarantee. |

### `source_app` drives list membership

| List | Query |
|---|---|
| Laporan Masuk (inbox) | `source_app != 'admin'` AND `status != 'selesai'` |
| Input Data | `source_app = 'admin'` (staff-keyed tickets) |
| Laporan Selesai | `status IN (respon_awal, respon_substantif, selesai)` AND `period = <month>` |

### Ticket numbering (`app/Models/Ticket.php`)

Public/API: `L-1400/092026/AB01` — prefix `L`/`A`/`I`, BPS code `1400`, `MMYYYY`, two random A–Z letters, zero-padded sequence.
Admin: `Administrator/09102026/01` — creator name / `DDMMYYYY` / sequence.

The sequence comes from a shared monthly counter under a Redis lock (`Cache::lock("ticket_counter:{$period}")`), backed by a unique index on `['period','sequence']`.

**⚠️ Both formats contain `/`.** Every `{ticketNumber}` route param must keep `->where('ticketNumber', '.*')`. Note the inconsistency: responses bind `{ticket}` (int ID) while everything else binds `{ticketNumber}`.

### Roles

| Actor | Access |
|---|---|
| Public | Submit, check, reply, self-complete. No auth. Per-IP throttled. |
| Operator | Dashboard + input data + inbox + responses + rekap. **Cannot** manage users, edit, or delete tickets. |
| Admin | Everything operator can do, plus `/dashboard/admin/operator` CRUD, ticket edit/delete, and **force logout** of other accounts. |

Authorization is enforced in three places, all of which matter: route middleware `role:admin` / `role:operator`, Form Request `authorize()`, and occasional inline `abort(403)`. There are **no policies or gates**.

Login redirects by role. `/dashboard` and `/settings` are bare redirects that branch on `isAdmin()`. There is no registration route — users are created by admins.

### Single session per account

One account may only hold **one active web session**. The source of truth is the `users` table, **not** the `sessions` table (this project uses Redis as the session driver, so that table is always empty).

| Column | Meaning |
|---|---|
| `users.current_session_id` | Session id allowed to act as this account. |
| `users.last_activity_at` | Last heartbeat. Written throttled (default every 60s). |
| `users.last_login_at` / `_ip` / `_agent` | Login fingerprint. `last_login_ip` is masked before ever reaching the UI. |

Thresholds live in `config/session_policy.php`: `active_threshold_minutes` (5) decides active vs stale, `inactivity_timeout_minutes` (120) decides session expiry, `single_session` and `allow_takeover` are env switches.

Order of checks in `App\Services\AuthenticateUser` is **load-bearing**:
1. Rate limit (per `email+ip`, then per ip).
2. Credential check — email-unknown and wrong-password produce the **identical** `__('auth.failed')` message, and `Hash::check` always runs (against a dummy bcrypt hash when the user is absent) so response time is not a side channel.
3. `is_active` → `AccountDisabledException`.
4. `Cache::lock("login:user:{id}")` + `lockForUpdate()` on the user row → session policy. Mismatch ⇒ `AccountInUseException` (409) **only** when `force` isn't set.
5. `session()->regenerate()`, `Auth::login()`, write the fingerprint columns.

`EnsureSingleSession` (web group, after `StartSession`) enforces it on every request, and is a no-op when authentication didn't come from a session (`actingAs()` in tests). Audit trail is the `auth_logs` table written by `App\Support\AuthLogger` — hashed + masked email only, never a password.

---

## Backend Conventions

**Controllers are fat.** There is no service/repository/DTO layer. Controllers own queries, cache orchestration, file I/O, mail, event dispatch, and Inertia prop shaping (`Admin/InputDataController.php` ~310 lines, `Api/TicketApiController.php` ~348 lines). Match that unless you're explicitly refactoring.

**Form Requests are used where it matters** — `app/Http/Requests/`. Do authorization + input normalization there:
- `StoreTicketRequest` — strips tags/control chars, lowercases email, digits-only WA, injects default `website` channel, conditional `required_if` on `service_type`/`satuan_tugas`.
- `StoreTicketResponseRequest` — authorizes admin ∥ operator, strips HTML, rejects `selesai` tickets. Fields are `response_type` / `response_message` / `response_attachments`.
- `UpdateTicketRequest` — `authorize()` returns `isAdmin()`.

**Validation messages are Indonesian.** So are `Log::error()` messages, Artisan output, Inertia flash/success strings, and JSON `message` fields. There's no `lang/` directory.

### `app/Support/` — the canonical pattern for shared logic

Static helper classes with typed array returns, no interfaces, no container bindings:

- **`TicketResponsePayload::from($response, $ticket)`** — serializes a response for Inertia props *and* broadcast payloads. Replaces a 5×-copy-pasted mapping. **Use this** instead of hand-rolling response arrays.
- **`RekapReport`** — maps `(classification, service_type)` → recap column, aggregates per channel, builds parent/child rows, formats periods with `now()->locale('id')->translatedFormat('F Y')`.
- **`RekapCache`** — recap cache key/version management.

Known duplication still present: `Admin\DashboardController` vs `Operator\DashboardController` (~95% identical), and the check-payload builder in `CheckTicketController` vs `TicketApiController`. `CheckTicketController` and `TicketApiController` also haven't been migrated to `TicketResponsePayload`.

**`App\Actions\ReplyToTicket` is the authority for saving a staff reply.** Controllers must not contain reply logic. The order of guarantees is deliberate:

1. `Cache::lock("ticket:{id}:reply", 10)` — twin requests don't both pile onto the row lock.
2. `DB::transaction()` + `Ticket::lockForUpdate()` — check + write is atomic.
3. Idempotency check before **and** inside the lock; the unique index catches the residual race via `UniqueConstraintViolationException` → replay.
4. `respon_awal` uniqueness is re-checked inside the lock so the client gets a **409 `TicketAlreadyRespondedException`** (with responder name + time) instead of an opaque DB error.
5. Status only moves forward (`STATUS_RANK`), `version` increments.
6. `afterCommit()` runs cache invalidation, the notification job, and the broadcast events — **only when `! $result->replayed`**, so a replay is silent.

Returns an `App\Actions\ReplyResult` (response + `replayed` flag), never a bare model.

### `app/Jobs/` — queued notification

`SendTicketResponseNotification` is idempotent via the `email_sent_at` flag: it re-reads the row, bails if already notified, queues the mailable, then stamps the flag. A failed notification never rolls back a saved reply.

### Caching (Redis) — manual and inconsistent

Any mutation of a `Ticket` must invalidate these; there is no central helper:

| Key | TTL | Invalidated by |
|---|---|---|
| `ticket:{ticket_number}` | 24h | `TicketResponseController`, `TicketApiController` |
| `ticket_check:{md5(ticket_number)}` | 30m | `TicketResponseController`, `CheckTicketController::reply` |
| `response:{id}` | 24h | `TicketResponseController` |
| `setting:{key}` | 30d | `Setting::set()` |
| `channels:tree` | 24h | inlined in `routes/web.php:24` **and** `InputDataController.php:105` |
| `dashboard:admin:version` | — | `Ticket::booted()` (increment); some controllers `Cache::forget(...)` instead (delete, not increment — works, different mechanism) |
| `rekap:version` + `RekapCache::SCHEMA='v2'` | 3600 | `AppServiceProvider::boot()` on `Ticket`/`Channel` saved/deleted |

Rate limiters are registered in `AppServiceProvider::boot()`: `ticket-store` 5/min, `ticket-check` 20/min, `ticket-reply` 10/min, `ticket-response` 20/min **per user id**.

### Events & broadcasting

| Event | Contract | Channel (public) | Broadcast as |
|---|---|---|---|
| `TicketCreated` | `ShouldBroadcastNow` | `admin.notifications` | `ticket.created` |
| `TicketUpdated` | `ShouldBroadcast` | `ticket.{ticket_number}` + presence `ticket.{id}` | `ticket.updated` |
| `TicketResponseCreated` | `ShouldBroadcast` | `ticket.{ticket_number}` + presence `ticket.{id}` | `ticket.response.created` |
| `InboxUpdated` | `ShouldBroadcast` | private `inbox.laporan-masuk` | `inbox.updated` |
| `SessionTerminated` | `ShouldBroadcast` | private `user.{id}` | `session.terminated` |
| `LoginAttemptBlocked` | `ShouldBroadcast` | private `user.{id}` | `login.attempt.blocked` |

All the reply-path events set `public bool $afterCommit = true` and `public string $queue = 'broadcasts'` so they never fire before the row is committed and never queue behind slow mail jobs. **The queue worker must therefore listen on the `broadcasts` queue** (`php artisan queue:work --queue=broadcasts,default`).

**`Broadcast::routes()` IS registered** (Laravel's `withRouting(channels: …)` → `withBroadcasting()`), so `/broadcasting/auth` exists on the `web` middleware. Private and presence channels therefore work.

Keep broadcast payloads PII-light — the two ticket channels are unauthenticated (`Channel`) except the presence/private ones. `SecurityTest` asserts `reporter_email`, `reporter_wa`, and `access_code` never appear in `/api/check`; preserve that when extending `broadcastWith()`.

### Localization

`lang/id/` holds **all** user-facing copy: `auth.php`, `validation.php`, `session.php`. `APP_LOCALE`, `APP_FALLBACK_LOCALE`, and `APP_FAKER_LOCALE` are all `id`. There was previously no `lang/` directory, which is why every message used to be hardcoded Indonesian inline — that is the pattern to avoid now.

`lang/id/auth.php::failed` MUST stay a single message for both "unknown email" and "wrong password". Splitting it is a user-enumeration leak and `LoginMessageTest` guards it.

### Auto-close

Three completion paths: reporter self-complete, lazy `Ticket::checkAndAutoClose()` on read (in `CheckTicketController::__invoke` and `TicketApiController::check`), and the batch command `php artisan tickets:auto-close` (scheduled hourly in `routes/console.php`).

Windows come from `Setting` keys: pengaduan **3d**, asfalto aspirations **1d**, permintaan informasi **5d**. Editable at `/settings/application`. Rule: auto-close only fires when the **latest** response has a non-null `user_id`.

---

## Routing

`routes/web.php`:
- Public: `home`, `tickets.store`, `tickets.check`, `tickets.check.reply`, `tickets.check.complete`
- `dashboard.admin.*` → `dashboard/admin` + `auth` + `role:admin`
- `dashboard.operator.*` → `dashboard/operator` + `auth` + `role:operator`

Both dashboard groups expose the same ~20 routes. The admin group adds 4 `operator.*` CRUD routes. Pages compute the prefix:

```tsx
const routePrefix = auth.user.role === 'admin' ? 'dashboard.admin' : 'dashboard.operator';
router.get(route(`${routePrefix}.laporan-masuk.index`));
```

`routes/api.php` uses a shared-secret `X-API-KEY` middleware (`api.key` alias → `EnsureApiKeyIsValid`), **not** Sanctum tokens. Sanctum is installed but vestigial — only the scaffold `GET /api/user` route uses it. There is **no API versioning**; routes live under the bare `/api` prefix. Every JSON response uses the envelope:

```json
{ "success": true, "message": "<Indonesian>", "data": { } }
```

with `201` create, `400` bad state, `401` bad key, `404` missing ticket, `422` validation.

Middleware aliases are declared in `bootstrap/app.php`: `role`, `api.key`. `SecurityHeaders` is appended to both web and api groups, and `EnsureSingleSession` to the web group. The exception responder renders the Inertia `error` page for 403/404/405/5xx on non-`api/*` requests, plus Indonesian renderers for 419 (page expired) and 429 (throttle with retry seconds).

**409 semantics:** `TicketResponseController::store` returns a real **409** when `$request->expectsJson()`. For Inertia requests it returns `back()->withErrors(['response_message' => …])->with('flash', ['conflict' => …])` instead — a 409 status on an Inertia POST is swallowed by the client (axios doesn't follow a non-3xx) and surfaces as an error modal, which would destroy the draft. The redirect keeps `useForm` state intact and carries the conflict payload (responder name + time) through the `flash.conflict` prop.

---

## Frontend Conventions

### Files

- kebab-case filenames; `.tsx` for anything with JSX, `.ts` for pure logic/types.
- **Inertia pages must be `export default`** at `resources/js/pages/<Inertia component path>.tsx`. `Inertia::render('admin/input-data')` → `resources/js/pages/admin/input-data.tsx`.
- Shared components use **named exports** (`export function AppSidebar(...)`).
- To modularize a large page, use the **page feature-module** convention (reference: `resources/js/pages/admin/input-data/`):
  ```
  index.tsx          # page entry, default export
  types.ts           # interfaces + string-literal union types
  utils.ts           # label/variant/format helpers
  constants.ts       # static option lists
  hooks/*.ts         # debounced filters, attachment validation
  components/*.tsx   # named exports
  ```
  Keep the old `.tsx` path as a 3-line re-export shim so the Inertia component name keeps resolving:
  ```tsx
  import InputData from './input-data/index';
  export default InputData;
  ```
- Cross-module reuse is explicit via absolute paths: `import { AttachmentField } from '@/pages/admin/input-data/components/attachment-field';`
- `resources/js/components/ui/*` is **shadcn territory and is Prettier-ignored**. Don't reformat it.

### Types

- `interface` for object shapes, `type` for unions/aliases.
- Page props: local `interface XPageProps extends SharedData`, read via `usePage<XPageProps>().props`.
- Inline `type` modifiers on imports: `import { type ChangeEvent, useState } from 'react';` (not `import type`).
- DB enums are mirrored as string-literal unions (`type Classification = 'pengaduan' | 'aspirasi' | 'permintaan_informasi'`).
- `strict: true` is on. There are **no `any` sites** in `resources/js`. If you need a typed form shape, declare it in the page's `types.ts` and let `useForm` infer from the object literal (see gotcha 8).
- `SharedData` in `resources/js/types/index.ts` is deliberately loose with `[key: string]: unknown`.

### Tailwind v4 — CSS-first

**There is no `tailwind.config.js`.** Never create one. All theming lives in `resources/css/app.css` via `@theme`, `@custom-variant`, `@plugin`, `@source`. The `"tailwind.config": "tailwind.config.js"` key in `components.json` and the ignore entry in `eslint.config.js` are stale.

- Class merging: `cn()` from `@/lib/utils` only (`twMerge(clsx(...))`). Both `clsx` and `cn` are registered as Prettier `tailwindFunctions`, so class order inside `cn()` is auto-sorted by `npm run format`.
- Dark mode is class-based via `@custom-variant dark (&:is(.dark *))` — every component writes explicit `dark:` utilities.
- Prefer semantic tokens (`bg-card`, `text-muted-foreground`, `text-destructive`, `border-input`) over raw palette. Raw colors are reserved for status accents and are always paired with a `dark:` variant.
- Brand blue is **`#005fb6`** (`:root --primary`). Dark primary is `hsl(211,100%,50%)`. `#005fb6` also appears hardcoded in `app.tsx` progress, `error.tsx`, and sidebar toast overrides.
- Custom utility `.custom-scrollbar` (6px thin scrollbars, light/dark aware) lives in `app.css`.
- Sizing is mixed between `h-4 w-4` (old) and `size-4` (new) — prefer `size-*` in new code.

### Forms

`useForm` from `@inertiajs/react` exclusively. No React Hook Form.

```tsx
const { data, setData, post, processing, errors, reset } = useForm({
    response_type: defaultType,
    response_message: '',
    response_attachments: [] as File[],
    idempotency_key, // crypto.randomUUID(), dibuat ulang saat form dibuka & setelah sukses
    expected_version: version,
});
```

- **Any POST carrying `File[]` needs `forceFormData: true`.**
- **`onError` must never call `reset()`** — the draft is the thing users care about most during a 409 conflict.
- Validation is **server-side only** (Form Requests). Render inline errors with the dominant one-liner:
  ```tsx
  {errors.field && <p className="text-destructive text-xs">{errors.field}</p>}
  ```
  The legacy `<InputError message={errors.email} />` component survives only in `login-form.tsx` and `pages/settings/application.tsx`.
- Action-level feedback uses **Sonner** (`import { toast } from 'sonner'`), not inline errors.
- Multiple independent `useForm` instances per page are normal.

### Real-time

`configureEcho({ broadcaster: 'reverb' })` runs once in `resources/js/app.tsx`.

| File | Channel | Hook | Event |
|---|---|---|---|
| `components/app-sidebar.tsx` | `admin.notifications` | `useEchoPublic` | `.ticket.created` |
| `components/app-header.tsx` | `admin.notifications` | `useEchoPublic` | `.ticket.created` |
| `pages/admin/laporan-masuk/show.tsx` | presence `ticket.{id}` | `useTicketRealtime` (`useEchoPresence`) | `.ticket.response.created` + `.ticket.updated` |
| `pages/admin/laporan-masuk.tsx` | private `inbox.laporan-masuk` | `useInboxRealtime` (`useEcho`) | `.inbox.updated` |
| `pages/check.tsx` | `ticket.{ticket_number}` | `useEchoPublic` | `.ticket.updated` |
| `components/session-provider.tsx` | private `user.{id}` | `useSessionGuard` (`useEcho`) | `.session.terminated` + `.login.attempt.blocked` |

`useTicketRealtime` (in `pages/admin/laporan-masuk/components/`) owns presence (`.here/.joining/.leaving`), the `typing` whisper, id-based dedupe, `useConnectionStatus`-driven reconnect resync, and a 30 s `router.reload` fallback **only while the socket is down and the tab is visible**. Keep the client-side payload interfaces in `realtime-types.ts` mirroring the PHP event `broadcastWith()` shapes.

`SessionProvider` wraps the whole Inertia app in `app.tsx` and skips both hooks for guests. `useSessionHeartbeat` posts to `session.ping` every 60 s via plain `fetch` (not an Inertia visit) and needs the `csrf-token` meta tag that `app.blade.php` now renders.

### Routing helper

`route()` is **global** — Ziggy is injected server-side via `@routes` in `app.blade.php` and declared with `declare global` in `app.tsx`. Never import it.

### Code style

- 4-space indent, single quotes, semicolons, 150-col width, `prettier-plugin-organize-imports` (runs on `npm run format`).
- JSX section-marker comments use a fixed English-slug vocabulary: `{/* Filter tabs */}`, `{/* Empty State */}`, `{/* Pagination Footer */}`, `{/* Response & Conversation Section */}`, etc.
- Business-domain comments are Indonesian; React lifecycle comments are English. Match surrounding intent.
- UI strings are Indonesian (`Laporan Masuk`, `Tambah Data Baru`, `Simpan Perubahan`, `Tidak ada laporan ditemukan`). The only English UI left is the appearance switcher (`Light` / `Dark`).
- `useAppearance` in `hooks/use-appearance.tsx` supports `'system'` in the type but the UI currently only offers Light/Dark (the `system` entries are commented out in `appearance-dropdown.tsx` and `appearance-tabs.tsx`).

---

## Testing

Pest v3. `tests/Pest.php` applies `RefreshDatabase` to `Feature`. Layout: `tests/Feature/…` mirroring the controller structure (`tests/Feature/Admin/`, `Api/`, `Auth/`, `Settings/`).

- Mostly functional Pest (`test()` / `it()`); `tests/Feature/DashboardTest.php` is a leftover PHPUnit class.
- **Only `UserFactory` exists.** No `Ticket`/`Channel`/`TicketResponse` factories — tests build records inline via `Ticket::create([...])` or local helpers (`createTicket()`, `selesaiTicket()`, `seedChannelTree()`, `rekapUrl()`).
- `Event::fake([TicketCreated::class])` is required in submission tests, otherwise Reverb pushes fire for real.
- `TicketConcurrencyTest` (reply safety: 409, idempotency replay, monotonic status, broadcast-once, channel authz) additionally swaps `broadcasting.default` to `reverb` and re-requires `routes/channels.php` after `Broadcast::purge()` — see gotcha 7.

Idiom to copy:

```php
actingAs(User::factory()->admin()->create())
    ->get(route('dashboard.admin.laporan-selesai.index'))
    ->assertOk()
    ->assertInertia(fn (Assert $page) => $page
        ->component('admin/laporan-selesai')
        ->where('filters.period', $current)
        ->has('tickets.data', 1));
```

Factory states: `->admin()`, `->operator()`, `->unverified()`.

---

## Domain Documentation

`alur/` holds hand-written Indonesian documentation of the system, derived from source: `usecase.md` (actor matrix + 25 PlantUML use cases), `erd.md` (conceptual + Crow's Foot ERD + data dictionary for all 9 tables), `flowchart-pelapor.md` (reporter journey). **These are the canonical domain reference — update them when business rules change.** (They still say "Laravel 11"; the app is Laravel 12.)