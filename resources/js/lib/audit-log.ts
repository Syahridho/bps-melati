import type { AuditFlag, ReviewGroup, Severity, Tingkat } from '@/types/audit-log';

export const FLAG_TYPE_LABELS: Record<string, string> = {
    jaringan_sama: 'Jaringan Sama',
    rating_cepat: 'Rating Cepat',
    rating_beruntun_ip: 'Rating Beruntun IP',
    selesai_cepat_setelah_balasan: 'Selesai Cepat Setelah Balasan',
    perangkat_sama: 'Perangkat Sama',
    penyelesaian_tidak_wajar: 'Penyelesaian Tidak Wajar',
    login_gagal_berulang: 'Login Gagal Berulang',
    login_baru: 'Login Baru',
    ekspor_sensitif: 'Ekspor Sensitif',
    perubahan_pengaturan_kritis: 'Perubahan Pengaturan Kritis',
};

export const severityVariant = (s: Severity) => (s === 'warning' ? 'destructive' : s === 'notice' ? 'secondary' : 'default');

const LEVEL_RANK: Record<Tingkat, number> = { rendah: 1, sedang: 2, tinggi: 3 };
const SEVERITY_RANK: Record<Severity, number> = { info: 1, notice: 2, warning: 3 };

const raiseLevel = (level: Tingkat): Tingkat => (level === 'rendah' ? 'sedang' : 'tinggi');

export function groupFlags(flags: AuditFlag[]): ReviewGroup[] {
    const groups = new Map<string, AuditFlag[]>();

    for (const flag of flags) {
        const key = flag.ticket_id != null ? `ticket-${flag.ticket_id}` : `flag-${flag.id}`;
        groups.set(key, [...(groups.get(key) ?? []), flag]);
    }

    return Array.from(groups.entries()).map(([key, items]) => {
        const types = Array.from(new Set(items.map((f) => f.type)));

        let tingkat = items.reduce<Tingkat>((max, f) => {
            const t = f.details?.tingkat ?? 'rendah';
            return LEVEL_RANK[t] > LEVEL_RANK[max] ? t : max;
        }, 'rendah');
        if (types.length >= 2) tingkat = raiseLevel(tingkat);

        const severity = items.reduce<Severity>((max, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[max] ? f.severity : max), 'info');

        const created_at = items.reduce((latest, f) => (new Date(f.created_at) > new Date(latest) ? f.created_at : latest), items[0].created_at);

        return {
            key,
            ticket_id: items[0].ticket_id ?? null,
            ticket_number: items[0].ticket_number ?? null,
            flags: items,
            types,
            tingkat,
            severity,
            representative: items[0],
            created_at,
        };
    });
}
