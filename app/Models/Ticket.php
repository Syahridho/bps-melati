<?php

namespace App\Models;

use App\Actions\AutoCloseTickets;
use App\Services\TicketCacheInvalidator;
use App\Services\TicketNumberGenerator;
use App\Support\ChannelFilter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_number',
        'period',
        'sequence',
        'classification',
        'title',
        'service_type',
        'satuan_tugas',
        'channel_id',
        'external_id',
        'external_parent_id',
        'external_permalink',
        'external_occurred_at',
        'external_author_handle',
        'reporter_name',
        'reporter_email',
        'reporter_wa',
        'content',
        'access_code',
        'status',
        'version',
        'is_read',
        'source_app',
        'created_by',
        'assigned_to',
        'assigned_at',
        'assignment_mode',
        'completed_at',
        'closed_reason',
        'last_staff_response_at',
        'is_pengawasan',
        'pengawasan_at',
        'pengawasan_by',
        'is_flagged',
        'flagged_at',
        'flagged_by',
        'flag_note',
        'rating',
        'rating_comment',
        'rated_at',
    ];

    protected function casts(): array
    {
        return [
            'external_occurred_at' => 'datetime',
            'is_read' => 'boolean',
            'is_pengawasan' => 'boolean',
            'completed_at' => 'datetime',
            'assigned_at' => 'datetime',
            'pengawasan_at' => 'datetime',
            'last_staff_response_at' => 'datetime',
            'sequence' => 'integer',
            'version' => 'integer',
            'is_flagged' => 'boolean',
            'flagged_at' => 'datetime',
            'rating' => 'integer',
            'rated_at' => 'datetime',
            'assigned_at' => 'datetime',
        ];
    }

    public function channel(): BelongsTo
    {
        return $this->belongsTo(Channel::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to')->withTrashed();
    }

    public function assignee(): BelongsTo
    {
        return $this->assignedTo();
    }

    public function assignmentLogs(): HasMany
    {
        return $this->hasMany(TicketAssignmentLog::class)->latest('id');
    }

    /**
     * Tiket dianggap tanpa PIC aktif bila belum punya PIC, atau PIC-nya
     * sudah nonaktif/tidak tersedia/dihapus. Hanya relevan untuk mode claim
     * dan round robin; tiket mode free memang tanpa PIC.
     */
    public function isOrphaned(): bool
    {
        if (! in_array($this->assignment_mode, ['claim', 'round_robin'], true)) {
            return false;
        }

        if ($this->assigned_to === null) {
            return true;
        }

        $pic = $this->assignedTo;

        return $pic === null
            || $pic->trashed()
            || ! $pic->is_active
            || ! $pic->is_available;
    }

    public function pengawasanBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'pengawasan_by')->withTrashed();
    }

    public function flaggedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'flagged_by')->withTrashed();
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }

    public function responses(): HasMany
    {
        return $this->hasMany(TicketResponse::class);
    }

    /**
     * Respons terakhir pada tiket ini (terlama -> terbaru), dipakai untuk
     * label "dibalas oleh X" di halaman daftar.
     */
    public function lastResponse(): HasOne
    {
        return $this->hasOne(TicketResponse::class)->latestOfMany('id');
    }

    /**
     * Batasi daftar ke kanal terpilih. Induk yang dipilih otomatis mencakup
     * seluruh sub-kanalnya, dan id hasil ekspansi selalu unik.
     *
     * @param  array<int, int|string>  $channelIds
     */
    public function scopeFilterByChannels(Builder $query, array $channelIds): Builder
    {
        $ids = ChannelFilter::expand($channelIds);

        if ($ids === []) {
            return $query;
        }

        return $query->whereIn('channel_id', $ids);
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->isAdmin() || $user->isOperator()) {
            return $query;
        }

        if ($user->isOperatorTim()) {
            return $query->where('created_by', $user->id);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * Auto-close active tickets whose last response from admin/operator exceeded the configured auto-close days.
     *
     * Wrapper tipis atas {@see AutoCloseTickets} supaya tidak ada dua implementasi.
     */
    public static function autoCloseExpiredTickets(): int
    {
        return app(AutoCloseTickets::class)->handle()->closedCount();
    }

    /**
     * Single ticket auto-close check helper.
     *
     * Memakai action yang sama agar aturan (status kandidat, balasan pelapor
     * menghentikan hitungan, closed_reason) selalu konsisten.
     */
    public function checkAndAutoClose(): bool
    {
        if ($this->status === 'selesai' || $this->last_staff_response_at === null) {
            return false;
        }

        $action = app(AutoCloseTickets::class);
        $days = $action->resolveWindows()[$this->classification] ?? null;

        if ($days === null) {
            return false;
        }

        $isCandidate = $action->candidateQuery($this->classification, $days)
            ->whereKey($this->getKey())
            ->exists();

        if (! $isCandidate) {
            return false;
        }

        return $action->closeOne((int) $this->getKey(), $days);
    }

    protected static function booted(): void
    {
        // Cache invalidation is centralized in AppServiceProvider via TicketCacheInvalidator.
    }

    /**
     * Mendapatkan prefix tiket berdasarkan klasifikasi.
     *
     * @return array{prefix: string, code: string}
     */
    public static function classificationMeta(string $classification): array
    {
        return match ($classification) {
            'pengaduan' => ['prefix' => 'L', 'code' => '1400'],
            'aspirasi' => ['prefix' => 'A', 'code' => '1400'],
            'permintaan_informasi' => ['prefix' => 'I', 'code' => '1400'],
            default => ['prefix' => 'X', 'code' => '0000'],
        };
    }

    /**
     * Kata sebutan jenis laporan dalam huruf kecil untuk konteks kalimat:
     * pengaduan | aspirasi | permintaan informasi | laporan (fallback).
     */
    public function classificationNoun(): string
    {
        return self::classificationNounFor($this->classification);
    }

    /**
     * Kata sebutan jenis laporan dengan huruf kapital di awal untuk awal kalimat.
     */
    public function classificationNounTitle(): string
    {
        return ucfirst($this->classificationNoun());
    }

    /**
     * Pemetaan nilai klasifikasi ke kata sebutan kalimat dengan fallback aman ke 'laporan'.
     */
    public static function classificationNounFor(?string $classification): string
    {
        return match ($classification) {
            'pengaduan' => 'pengaduan',
            'aspirasi' => 'aspirasi',
            'permintaan_informasi' => 'permintaan informasi',
            default => 'laporan',
        };
    }

    /**
     * Nama kanal publik (broadcast) untuk sebuah nomor tiket.
     *
     * Nomor tiket selalu memuat `/` (mis. `L-1400/102026/EE18`), sedangkan
     * protokol Pusher/Reverb hanya mengizinkan `[A-Za-z0-9_\-=,.@]` pada nama
     * kanal — memakai nomor mentah akan ditolak broadcaster dengan
     * "Invalid channel name". Karakter lain karena itu diganti `-`; nomor tiket
     * selalu berstruktur tetap sehingga hasil penggantian tetap unik.
     *
     * Padanan frontend ada di `resources/js/lib/incoming-reports-utils.ts`.
     */
    public static function publicChannelName(string $ticketNumber): string
    {
        return 'ticket.'.preg_replace('/[^A-Za-z0-9_\-=,.@]/', '-', $ticketNumber);
    }

    /**
     * Generate nomor tiket. Format: P-1400/MMYYYY/AA01
     * P = Prefix klasifikasi, MM = bulan, YYYY = tahun, AA = 2 huruf acak, 01 = nomor urut (AA100 jika >= 100)
     *
     * Delegasi ke {@see TicketNumberGenerator} supaya jalur
     * publik dan Input Data berbagi satu sumber kebenaran pembuatan nomor.
     */
    public static function generateTicketNumber(string $classification, string $period): array
    {
        return app(TicketNumberGenerator::class)->generate($classification, $period);
    }

    /**
     * Scope filter per tab yang dipakai bersama di Laporan Masuk dan Input Data.
     */
    /**
     * Tiket aktif pada mode claim/round robin yang PIC-nya kosong atau tidak aktif.
     */
    public function scopeWithoutActivePic(Builder $query): Builder
    {
        return $query->where('status', '!=', 'selesai')
            ->whereIn('assignment_mode', ['claim', 'round_robin'])
            ->where(function (Builder $query): void {
                $query->whereNull('assigned_to')
                    ->orWhereHas('assignedTo', function (Builder $userQuery): void {
                        $userQuery->where('is_active', false)
                            ->orWhere('is_available', false)
                            ->orWhereNotNull('deleted_at');
                    });
            });
    }

    public function scopeApplyTabFilter(Builder $query, string $tab): Builder
    {
        return match ($tab) {
            'tanpa_pic' => $query->withoutActivePic(),
            'belum_dibaca' => $query->where('is_read', false),
            'pengaduan' => $query->where('classification', 'pengaduan'),
            'aspirasi' => $query->where('classification', 'aspirasi'),
            'permintaan', 'permintaan_informasi' => $query->where('classification', 'permintaan_informasi'),
            'respon_awal' => $query->where('status', 'respon_awal'),
            'respon_substantif' => $query->where('status', 'respon_substantif'),
            'berkadar_pengawasan' => $query->where('is_pengawasan', true),
            'ditandai' => $query->where('is_flagged', true),
            'selesai' => $query->where('status', 'selesai'),
            default => $query,
        };
    }

    /**
     * Filter tiket berdasarkan tanggal selesai inklusif (awal s/d akhir hari),
     * dengan fallback ke `updated_at` bila `completed_at` masih NULL pada data lama.
     */
    public function scopeCompletedBetween(Builder $query, string $fromDate, string $toDate): Builder
    {
        $start = $fromDate.' 00:00:00';
        $end = $toDate.' 23:59:59';

        return $query->where(function (Builder $dateQuery) use ($start, $end): void {
            $dateQuery->whereBetween('completed_at', [$start, $end])
                ->orWhere(function (Builder $fallbackQuery) use ($start, $end): void {
                    $fallbackQuery->whereNull('completed_at')
                        ->whereBetween('updated_at', [$start, $end]);
                });
        });
    }

    /**
     * Urutkan laporan selesai dari waktu selesai terbaru, dengan fallback `updated_at`
     * untuk data lama dan tie-breaker `id DESC` agar urutan stabil.
     */
    public function scopeOrderByCompletedDesc(Builder $query): Builder
    {
        return $query->orderByRaw('COALESCE(completed_at, updated_at) DESC')
            ->orderByDesc('id');
    }

    public static function accessCodeRequired(): bool
    {
        return (bool) config('ticket.require_access_code', true);
    }

    public function accessCodeMatches(?string $code): bool
    {
        // Kode akses bersifat opsional: bila tidak dikirim, aksi tetap diizinkan.
        // Bila dikirim, harus cocok dengan kode yang tersimpan.
        if (blank($code)) {
            return true;
        }

        return filled($this->access_code)
            && hash_equals((string) $this->access_code, (string) $code);
    }
}
