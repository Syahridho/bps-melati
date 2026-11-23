export function formatDuration(startIso: string, endIso: string): string {
    const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    const days = Math.floor(diffMs / 86_400_000);
    const hours = Math.floor((diffMs % 86_400_000) / 3_600_000);
    const mins = Math.floor((diffMs % 3_600_000) / 60_000);

    if (days > 0) return `${days} hari ${hours} jam`;
    if (hours > 0) return `${hours} jam ${mins} menit`;
    return `${mins} menit`;
}
