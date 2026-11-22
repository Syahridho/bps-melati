### N+1 / query report (bahan Fase 4, belum diperbaiki)

Top 6 endpoint boros dari pengukuran latest (empty DB run, 200/400 tickets):

| # | Endpoint | Query (med) | Penyebab dominan |
|---|---|---|---|
| 1 | audit-log.summary-weekly | 10 (empty DB) / 10 (200/400) | Agregat berulang di `SummaryWeeklyController::index`. |
| 2 | audit-log.flags-summary | 10 (empty) / 10 (200/400) | Agregat berulang + count per-status + count distinct tiket. |
| 3 | periodic-recap.index | 28 (empty) / 9 (200/400) | Rekap per periode dengan query berulang per channel+period, groupBy kompleks. |
| 4 | operator incoming-reports.index | 6 (empty) / 12 (200/400) | Count per tab + cache list + query base duplikat. |
| 5 | admin input-data.index | 12 (empty) / 6 (200/400) | Query terpisah untuk stats/filter + cache key berulang. |
| 6 | admin/operator incoming & my reports | 11-12 | Duplikasi count base query + tab aggregate. |

Format "64/10" pada laporan sebelumnya merujuk pada hasil awal sebelum adanya cache invalidator dan optimisasi query di Fase 3: 64 query tanpa cache, turun ke 10 setelah cache aktif dan eager loading diimplementasikan. Angka ini bersifat historis sebagai pembanding sebelum refactor.

### Keputusan yang disetujui

- Event broadcast tidak digabung; nama `broadcastAs()` tetap.
- Nilai database, nama route, JSON, dan Inertia props tetap.
- Fase 5b (rename massal) ditunda.

### 3d — daftar assignment

Diubah: `TicketAssignmentService`, `AutoCloseTickets` (delegasi), `TicketAssignmentController`.
Sudah benar: grep `Ticket::query()->update(...)` untuk assignment di luar service tidak ditemukan.

### 3c — bukti

Grep `AuditLogger`/`AuditLog::create` di `app/Http/Controllers`: tidak ditemukan.
Semua `Record*Audit` (4 class) memakai `AuditLogger::log`.

### 3e — laporan filter

- `IncomingReportsController` dan `MyReportsController` memakai `LaporanTicketQuery::activeList` + `LaporanFilter`/`LaporanFilterQuery`/`BuildsLaporanListPayload`, sama dengan Completed (Completed memakai `LaporanFilterQuery::searchClosure`).
- `completedListTicket` di `BuildsLaporanListPayload` berbeda dengan `laporanListTicket` karena menyertakan `closed_reason` dan `completed_at`.

### Audit flag tests diperketat

Tes badge diperketat agar gagal saat invalidator dimatikan (termasuk `AuditFlag::cacheVersion()` untuk audit flag). Test `AuditRecordPayloadTest` mengunci `event_type`, `category`, `severity`, dan kunci payload untuk reporter completion, setting update, audit flag review, export.
