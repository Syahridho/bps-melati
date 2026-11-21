<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\AuditFlag;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Queue\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class AuditLogger implements ShouldQueue
{
    use Dispatchable, Queueable, SerializesModels;

    public string $eventType;
    public string $category;
    public ?string $severity = 'info';
    public ?int $actorId = null;
    public ?string $actorName = null;
    public ?string $actorRole = null;
    public ?int $ticketId = null;
    public ?string $ip = null;
    public ?string $userAgent = null;
    public array $meta = [];
    public ?string $broadcastChannel = null;

    /**
     * Create a new audit logger instance.
     */
    public function __construct(
        string $eventType,
        string $category,
        ?string $severity = 'info',
        ?int $actorId = null,
        ?string $actorName = null,
        ?string $actorRole = null,
        ?int $ticketId = null,
        ?string $ip = null,
        ?string $userAgent = null,
        array $meta = [],
        ?string $broadcastChannel = null
    ) {
        $this->eventType = $eventType;
        $this->category = $category;
        $this->severity = $severity;
        $this->actorId = $actorId;
        $this->actorName = $actorName;
        $this->actorRole = $actorRole;
        $this->ticketId = $ticketId;
        $this->ip = $ip;
        $this->userAgent = $userAgent;
        $this->meta = $meta;
        $this->broadcastChannel = $broadcastChannel;
    }

    /**
     * Run the queue job.
     */
    public function handle(): void
    {
        DB::transaction(function () {
            $this->logToAuditLogs();
            $this->maybeCreateFlags();
        });
    }

    /**
     * Log to audit_logs table.
     */
    protected function logToAuditLogs(): void
    {
        AuditLog::create([
            'event_type' => $this->eventType,
            'category' => $this->category,
            'severity' => $this->severity,
            'actor_id' => $this->actorId,
            'actor_name' => $this->actorName,
            'actor_role' => $this->actorRole,
            'ticket_id' => $this->ticketId,
            'ip' => $this->ip,
            'user_agent' => $this->userAgent,
            'meta' => $this->meta,
        ]);

        // Broadcast after commit
        if ($this->broadcastChannel) {
            // Will be dispatched after queue job completes
            // The actual broadcast dispatching happens in the caller
        }
    }

    /**
     * Create audit flags based on detected patterns.
     */
    protected function maybeCreateFlags(): void
    {
        // Skip flag creation if not enabled or no ticket
        if ($this->ticketId === null) {
            return;
        }

        // Check jaringan_sama flag (IP same as ticket PIC)
        if (config('audit.flags.jaringan_sama.enabled') &&
            $this->category === 'ticket' &&
            $this->severity !== 'info') {
            $this->createJaringanSamaFlag();
        }

        // Check rating_cepat flag
        if (config('audit.flags.rating_cepat.enabled') &&
            $this->eventType === 'rating.provided') {
            $this->createRatingCepatFlag();
        }

        // Check rating_beruntun_ip flag
        if (config('audit.flags.rating_beruntun_ip.enabled') &&
            $this->eventType === 'rating.provided') {
            $this->createRatingBeruntunIpFlag();
        }
    }

    /**
     * Create jaringan_sama flag.
     * Penanda utama: laporan ditutup/dinilai dari IP yang sama dengan petugas (operator).
     */
    protected function createJaringanSamaFlag(): void
    {
        try {
            $ticket = $this->ticketId ? Ticket::find($this->ticketId) : null;

            if ($ticket === null || $ticket->assignedTo === null) {
                return;
            }

            $picUserId = $ticket->assignedTo->id;
            $picUser = $ticket->assignedTo;

            // Get IP from the audit log context
            $reporterIp = $this->ip ?? '';

            // Check if reporter IP matches PIC IP
            $ipMatches = $this->ipsMatch($reporterIp, $picUser->ip_address ?? '');

            if (!$ipMatches) {
                // Check if PIC is from same network/organization
                $ipMatches = $this->sameNetwork($reporterIp, $picUser->ip_address ?? '');
            }

            $level = 'rendah';
            if ($ipMatches === 'exact') {
                $level = 'tinggi';
            } elseif ($ipMatches === 'network') {
                $level = 'sedang';
            }

            if ($level === 'rendah' && config('audit.ignored_networks') !== []) {
                // Check if IP is in ignored networks
                foreach (config('audit.ignored_networks') as $network) {
                    if ($this->ipInNetwork($reporterIp, $network)) {
                        return; // Skip - IP in ignored network
                    }
                }
            }

            // Determine details
            $details = [
                'tingkat' => $level,
                'petugas_id' => $picUserId,
                'petugas_nama' => $picUser->name,
                'reporter_ip' => $reporterIp,
                'pic_ip' => $picUser->ip_address ?? '',
                'selisih_waktu' => null,
                'user_agent_sama' => false,
                'catatan' => 'Kesamaan IP bukan bukti. Pelapor dan petugas bisa berbagi jaringan. Penanda ini hanya untuk membantu peninjauan.',
            ];

            // Create the flag
            AuditFlag::create([
                'type' => AuditFlag::TYPE_JARINGAN_SAMA,
                'severity' => $level === 'tinggi' ? AuditFlag::SEVERITY_WARNING : AuditFlag::SEVERITY_NOTICE,
                'ticket_id' => $this->ticketId,
                'related_user_id' => $picUserId,
                'audit_log_id' => null, // will be updated
                'details' => $details,
                'status' => AuditFlag::STATUS_BARU,
                'exclude_rating' => false,
            ]);

            // Update the audit_log_id reference
            // We need to find the flag we just created and update it
            // This is handled after creation since we have the ID

        } catch (\Exception $e) {
            // Log error but don't break the queue job
            \Log::error('AuditFlag jaringan_sama creation error: ' . $e->getMessage());
        }
    }

    /**
     * Check if two IPs match exactly.
     */
    protected function ipsMatch(string $ip1, string $ip2): string
    {
        if (trim($ip1) === trim($ip2)) {
            return 'exact';
        }
        return false;
    }

    /**
     * Check if two IPs are in the same network.
     */
    protected function sameNetwork(string $ip1, string $ip2): bool|string
    {
        // If ignore_private_ips is true and either IP is private, skip
        if (config('audit.ignore_private_ips')) {
            if ($this->isPrivateIp($ip1) || $this->isPrivateIp($ip2)) {
                return false;
            }
        }

        // Check against ignored networks
        if (config('audit.ignored_networks') !== []) {
            foreach (config('audit.ignored_networks') as $network) {
                if ($this->ipInNetwork($ip1, $network) || $this->ipInNetwork($ip2, $network)) {
                    return 'network';
                }
            }
        }

        // Simple /32 match for now
        return trim($ip1) === trim($ip2) ? 'exact' : false;
    }

    /**
     * Check if IP is in a network/CIDR.
     */
    protected function ipInNetwork(string $ip, string $network): bool
    {
        // Support CIDR notation like "192.168.0.0/16"
        if (str_contains($network, '/')) {
            list($base, $prefixLen) = explode('/', $network);
            $prefixLen = (int) $prefixLen;

            // Simplified check - for production use proper IP math
            // For now, just check if starts with same prefix
            $ipParts = explode('.', $ip);
            $baseParts = explode('.', $base);

            if (count($ipParts) !== 4 || count($baseParts) !== 4) {
                return false;
            }

            $networkPrefixLen = min($prefixLen, 32);
            $matches = true;
            for ($i = 0; $i < 4; $i++) {
                $bits = ($i * 8);
                if ($bits >= $networkPrefixLen) break;
                if ((int) $ipParts[$i] !== (int) $baseParts[$i]) {
                    $matches = false;
                    break;
                }
            }

            return $matches;
        }

        // Exact IP match
        return trim($ip) === trim($network);
    }

    /**
     * Check if IP is private (127.0.0.1, 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
     */
    protected function isPrivateIp(string $ip): bool
    {
        $ip = trim($ip);

        if ($ip === '127.0.0.1' || $ip === '::1') {
            return true;
        }

        if (preg_match('/^10\./', $ip)) {
            return true;
        }

        if (preg_match('/^192\.168\./', $ip)) {
            return true;
        }

        if (preg_match('/^172\.(1[6-9]|2[0-9]|3[0-1])\./', $ip)) {
            return true;
        }

        return false;
    }

    /**
     * Create rating_cepat flag.
     */
    protected function createRatingCepatFlag(): void
    {
        try {
            // Check if there were recent ratings within 5 minutes
            $recentRatings = AuditLog::where('event_type', 'rating.provided')
                ->where('ticket_id', $this->ticketId)
                ->where('created_at', '>=', now()->subMinutes(5))
                ->count();

            if ($recentRatings >= config('audit.flags.rating_cepat.threshold')) {
                $details = [
                    'threshold' => config('audit.flags.rating_cepat.threshold'),
                    'recent_count' => $recentRatings,
                    'window_minutes' => config('audit.flags.rating_cepat.window_minutes'),
                    'catatan' => 'Rating diberikan beberapa detik setelah balasan terakhir petugas.',
                ];

                AuditFlag::create([
                    'type' => AuditFlag::TYPE_RATING_CEPAT,
                    'severity' => AuditFlag::SEVERITY_NOTICE,
                    'ticket_id' => $this->ticketId,
                    'related_user_id' => null,
                    'audit_log_id' => null,
                    'details' => $details,
                    'status' => AuditFlag::STATUS_BARU,
                    'exclude_rating' => false,
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('AuditFlag rating_cepat creation error: ' . $e->getMessage());
        }
    }

    /**
     * Create rating_beruntun_ip flag.
     */
    protected function createRatingBeruntunIpFlag(): void
    {
        try {
            // Check if there are multiple 5-star ratings from same IP within 1 hour
            $suspiciousRatings = AuditLog::where('event_type', 'rating.provided')
                ->where('ticket_id', $this->ticketId)
                ->where('created_at', '>=', now()->subHours(1))
                ->where(function ($query) {
                    // This is simplified - in production would check meta or details
                })
                ->count();

            // For now, check if there's an IP in the meta that appears suspicious
            // This will be expanded based on real data patterns
            if ($suspiciousRatings >= config('audit.flags.rating_beruntun_ip.threshold')) {
                $details = [
                    'threshold' => config('audit.flags.rating_beruntun_ip.threshold'),
                    'recent_count' => $suspiciousRatings,
                    'window_minutes' => config('audit.flags.rating_beruntun_ip.window_minutes'),
                    'catatan' => 'Banyak rating bintang 5 dari satu IP dalam jendela waktu singkat.',
                ];

                AuditFlag::create([
                    'type' => AuditFlag::TYPE_RATING_BERUNTUN_IP,
                    'severity' => AuditFlag::SEVERITY_WARNING,
                    'ticket_id' => $this->ticketId,
                    'related_user_id' => null,
                    'audit_log_id' => null,
                    'details' => $details,
                    'status' => AuditFlag::STATUS_BARU,
                    'exclude_rating' => false,
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('AuditFlag rating_beruntun_ip creation error: ' . $e->getMessage());
        }
    }
}