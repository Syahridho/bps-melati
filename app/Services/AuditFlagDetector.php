<?php

namespace App\Services;

use App\Models\AuditFlag;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\User;
use App\Support\AuditFlagTimeCalculator;
use App\Support\ClientIpResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Detektor penanda (audit flag) yang dijalankan sinkron saat pelapor menutup tiket.
 *
 * Aturan yang didukung:
 *  - jaringan_sama: IP pelapor sama dengan IP PIC (balasan terakhir).
 *  - rating_beruntun_ip: beberapa rating dari IP yang sama dalam jendela waktu.
 *  - selesai_cepat_setelah_balasan: tiket ditutup (dengan/tanpa rating) terlalu cepat setelah balasan operator.
 */
class AuditFlagDetector
{
    /**
     * Titik masuk utama. Dijalankan pada jalur penutupan oleh pelapor.
     */
    public function detectForTicketCompletion(
        Ticket $ticket,
        ?AuditLog $auditLog = null,
        ?Request $request = null,
    ): void {
        $this->detect($ticket, $auditLog, $request);
    }

    public function detectCompletion(Ticket $ticket, ?AuditLog $auditLog = null, ?Request $request = null): void
    {
        $this->detect($ticket, $auditLog, $request);
    }

    public function detect(Ticket $ticket, ?AuditLog $auditLog = null, ?Request $request = null): void
    {
        if (! (bool) config('audit.flags.selesai_cepat_setelah_balasan.enabled', true)
            && ! (bool) config('audit.flags.jaringan_sama.enabled', true)
            && ! (bool) config('audit.flags.rating_beruntun_ip.enabled', true)) {
            return;
        }

        // Pastikan ada audit log sebagai jangkar relasi.
        if ($auditLog === null) {
            $auditLog = AuditLogger::log(
                eventType: 'audit.flag_detected',
                category: 'audit',
                ticket: $ticket,
                request: $request,
                severity: 'info',
                broadcast: false,
            );
        }

        if ($auditLog === null) {
            return;
        }

        $ticket->refresh();
        $ticket->loadMissing(['assignedTo', 'responses.user']);

        $tz = AuditFlagTimeCalculator::timezone();
        $completedAt = $ticket->completed_at?->copy()->timezone($tz);
        $ratedAt = ($ticket->rated_at ?? $ticket->completed_at)?->copy()->timezone($tz);
        $reporterIp = ClientIpResolver::resolve($request) ?? ClientIpResolver::normalize($auditLog->ip);
        $rating = $ticket->rating;

        // Balasan operator terakhir sebelum penutupan (untuk info PIC/panjang balasan).
        $referenceTime = $completedAt ?? $ratedAt ?? now()->timezone($tz);
        $lastStaffResponse = AuditFlagTimeCalculator::findLastStaffResponseBefore($ticket, $referenceTime);

        $replyMessage = (string) ($lastStaffResponse?->message ?? '');
        $replyLength = mb_strlen(trim($replyMessage));

        $picUser = $ticket->assignedTo ?? ($lastStaffResponse?->user ?? null);
        $picName = $picUser?->name;

        // IP PIC diambil dari audit log balasan operator terakhir.
        $replyAuditLog = AuditLog::query()
            ->where('ticket_id', $ticket->id)
            ->where('event_type', 'ticket.replied')
            ->latest('created_at')
            ->first();

        $picIp = ClientIpResolver::normalize($replyAuditLog?->ip);

        $hasLoopbackIp = ClientIpResolver::isLoopback($reporterIp) || ClientIpResolver::isLoopback($picIp);
        $sameNonLoopbackIp = $reporterIp !== null
            && $picIp !== null
            && ! $hasLoopbackIp
            && ClientIpResolver::equals($reporterIp, $picIp);

        if ($hasLoopbackIp && (bool) config('audit.flags.jaringan_sama.enabled', true)) {
            Log::warning('Deteksi jaringan_sama dilewati karena IP loopback/tidak valid (cek konfigurasi TRUSTED_PROXIES / reverse proxy).', [
                'ticket_id' => $ticket->id,
                'ticket_number' => $ticket->ticket_number,
                'reporter_ip' => $reporterIp,
                'pic_ip' => $picIp,
            ]);
        }

        // 1. jaringan_sama
        if ((bool) config('audit.flags.jaringan_sama.enabled', true)
            && $sameNonLoopbackIp
            && ! $this->isIgnoredIp($reporterIp)) {
            $this->createFlag(
                AuditFlag::TYPE_JARINGAN_SAMA,
                $ticket,
                $auditLog,
                [
                    'tingkat' => 'tinggi',
                    'petugas_nama' => $picName,
                    'reporter_ip' => $reporterIp,
                    'pic_ip' => $picIp,
                    'catatan' => 'IP pelapor sama dengan IP PIC.',
                ],
                'tinggi',
                $picUser,
            );
        }

        // 2. selesai_cepat_setelah_balasan (penutupan oleh pelapor, dengan atau tanpa rating)
        $selesaiConfig = (array) config('audit.flags.selesai_cepat_setelah_balasan', []);
        $isReporterClosure = $ticket->closed_reason === null || $ticket->closed_reason === 'reporter';
        $actionAt = match (true) {
            $completedAt !== null && $ratedAt !== null => $completedAt->lessThanOrEqualTo($ratedAt) ? $completedAt : $ratedAt,
            $completedAt !== null => $completedAt,
            default => $ratedAt,
        };

        if (($selesaiConfig['enabled'] ?? true) && $isReporterClosure) {
            $closeReply = $actionAt !== null
                ? AuditFlagTimeCalculator::findLastStaffResponseBefore($ticket, $actionAt)
                : null;
            $closeReplyAt = ($closeReply?->sent_at ?? $closeReply?->created_at)?->copy()->timezone($tz);
            $closeDiffSeconds = AuditFlagTimeCalculator::elapsedSeconds($closeReplyAt, $actionAt);

            if ($closeDiffSeconds === null) {
                Log::warning('Deteksi selesai_cepat_setelah_balasan dilewati karena data waktu tidak lengkap atau selisih negatif.', [
                    'ticket_id' => $ticket->id,
                    'ticket_number' => $ticket->ticket_number,
                    'reply_at' => $closeReplyAt?->toIso8601String(),
                    'action_at' => $actionAt?->toIso8601String(),
                ]);
            } else {
                $highSeconds = (int) ($selesaiConfig['high_seconds'] ?? 120);
                $mediumSeconds = (int) ($selesaiConfig['medium_seconds'] ?? 600);

                if ($closeDiffSeconds < $highSeconds) {
                    $tingkat = 'tinggi';
                } elseif ($closeDiffSeconds < $mediumSeconds) {
                    $tingkat = 'sedang';
                } else {
                    $tingkat = null;
                }

                if ($tingkat !== null) {
                    $closeReplyMessage = (string) ($closeReply?->message ?? $replyMessage);
                    $closeReplyLength = mb_strlen(trim($closeReplyMessage));

                    // Penguat
                    $boost = false;
                    if ($sameNonLoopbackIp) {
                        $boost = true;
                    }
                    if ($rating === 5) {
                        $boost = true;
                    }
                    $shortReplyChars = (int) ($selesaiConfig['short_reply_chars'] ?? 30);
                    if ($closeReplyLength > 0 && $closeReplyLength < $shortReplyChars) {
                        $boost = true;
                    }
                    if ($this->isLowQualityReply($closeReplyMessage, $ticket->ticket_number)) {
                        $boost = true;
                    }

                    // Pelemah
                    $weaken = false;
                    if ($closeReplyLength >= 100 && ! $sameNonLoopbackIp) {
                        $weaken = true;
                    }

                    if ($boost) {
                        $tingkat = $this->raiseLevel($tingkat);
                    }
                    if ($weaken) {
                        $tingkat = $this->lowerLevel($tingkat);
                    }

                    $normalizedSeconds = AuditFlagTimeCalculator::normalizeSeconds($closeDiffSeconds);
                    $catatan = AuditFlagTimeCalculator::buildReason(
                        AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN,
                        $closeDiffSeconds,
                        $mediumSeconds,
                        $sameNonLoopbackIp,
                    );

                    $this->createFlag(
                        AuditFlag::TYPE_SELESAI_CEPAT_SETELAH_BALASAN,
                        $ticket,
                        $auditLog,
                        [
                            'tingkat' => $tingkat,
                            'petugas_nama' => $picName,
                            'reporter_ip' => $reporterIp,
                            'pic_ip' => $picIp,
                            'selisih_detik' => $normalizedSeconds,
                            'response_id' => $closeReply?->id,
                            'reply_at' => $closeReplyAt?->toIso8601String(),
                            'action_at' => $actionAt?->toIso8601String(),
                            'threshold_seconds' => $mediumSeconds,
                            'same_ip' => $sameNonLoopbackIp,
                            'panjang_balasan' => $closeReplyLength,
                            'rating' => $rating,
                            'catatan' => $catatan,
                        ],
                        $tingkat,
                        $picUser,
                    );
                }
            }
        }

        // 3. rating_beruntun_ip
        if ((bool) config('audit.flags.rating_beruntun_ip.enabled', true)
            && $reporterIp !== null
            && ! ClientIpResolver::isLoopback($reporterIp)
            && ! $this->isIgnoredIp($reporterIp)) {
            $windowMinutes = (int) config('audit.flags.rating_beruntun_ip.window_minutes', 60);
            $threshold = (int) config('audit.flags.rating_beruntun_ip.threshold', 3);

            $count = AuditLog::query()
                ->whereIn('event_type', ['ticket.rated', 'ticket.completed_by_reporter'])
                ->where('ip', $reporterIp)
                ->where('created_at', '>=', now()->subMinutes($windowMinutes))
                ->distinct('ticket_id')
                ->count('ticket_id');

            if ($count >= $threshold) {
                $this->createFlag(
                    AuditFlag::TYPE_RATING_BERUNTUN_IP,
                    $ticket,
                    $auditLog,
                    [
                        'tingkat' => 'sedang',
                        'reporter_ip' => $reporterIp,
                        'jumlah' => $count,
                        'catatan' => "Rating beruntun dari IP yang sama ({$count} tiket).",
                    ],
                    'sedang',
                    $picUser,
                );
            }
        }
    }

    public function handle(Ticket $ticket, ?AuditLog $auditLog = null, ?Request $request = null): void
    {
        $this->detect($ticket, $auditLog, $request);
    }

    public function run(Ticket $ticket, ?AuditLog $auditLog = null, ?Request $request = null): void
    {
        $this->detect($ticket, $auditLog, $request);
    }

    public function evaluate(Ticket $ticket, ?AuditLog $auditLog = null, ?Request $request = null): void
    {
        $this->detect($ticket, $auditLog, $request);
    }

    protected function createFlag(
        string $type,
        Ticket $ticket,
        AuditLog $auditLog,
        array $details,
        string $tingkat,
        ?User $relatedUser = null,
    ): void {
        // Cegah duplikat per tiket per tipe.
        if (AuditFlag::query()->where('ticket_id', $ticket->id)->where('type', $type)->exists()) {
            return;
        }

        $severity = match ($tingkat) {
            'tinggi' => AuditFlag::SEVERITY_WARNING,
            'sedang' => AuditFlag::SEVERITY_NOTICE,
            default => AuditFlag::SEVERITY_INFO,
        };

        try {
            AuditFlag::create([
                'type' => $type,
                'severity' => $severity,
                'ticket_id' => $ticket->id,
                'related_user_id' => $relatedUser?->id,
                'audit_log_id' => $auditLog->id,
                'details' => $details,
                'status' => AuditFlag::STATUS_BARU,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Gagal membuat audit flag.', [
                'type' => $type,
                'ticket_id' => $ticket->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    protected function isIgnoredIp(?string $ip): bool
    {
        if ($ip === null) {
            return true;
        }

        if (in_array($ip, (array) config('audit.ignored_networks', []), true)) {
            return true;
        }

        if ((bool) config('audit.ignore_private_ips', false)) {
            // filter_var returns false jika IP berada pada range privat/reserved.
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                return true;
            }
        }

        return false;
    }

    protected function isLowQualityReply(string $message, ?string $ticketNumber): bool
    {
        $trimmed = trim($message);
        if ($trimmed === '') {
            return true;
        }

        if (mb_strlen($trimmed) < 10) {
            return true;
        }

        // Hanya angka / nomor tiket
        if (preg_match('/^[\d\s\-\/\.]+$/u', $trimmed)) {
            return true;
        }

        // Teks berulang
        if (preg_match('/^(.+?)\1{2,}$/u', $trimmed)) {
            return true;
        }

        if ($ticketNumber !== null && mb_strpos($trimmed, $ticketNumber) !== false && mb_strlen($trimmed) < 60) {
            // Balasan yang hanya mengulang nomor tiket
            $withoutTicket = str_replace($ticketNumber, '', $trimmed);
            if (mb_strlen(trim($withoutTicket)) < 10) {
                return true;
            }
        }

        return false;
    }

    protected function raiseLevel(string $level): string
    {
        return match ($level) {
            'rendah' => 'sedang',
            'sedang' => 'tinggi',
            default => 'tinggi',
        };
    }

    protected function lowerLevel(string $level): string
    {
        return match ($level) {
            'tinggi' => 'sedang',
            'sedang' => 'rendah',
            default => 'rendah',
        };
    }
}
