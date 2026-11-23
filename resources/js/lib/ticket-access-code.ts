const keyOf = (ticketNumber: string) => `ticket_access_code_${ticketNumber}`;

export function getStoredAccessCode(ticketNumber: string): string {
    try {
        return sessionStorage.getItem(keyOf(ticketNumber)) ?? '';
    } catch {
        return '';
    }
}

export function storeAccessCode(ticketNumber: string, code: string): void {
    try {
        sessionStorage.setItem(keyOf(ticketNumber), code);
    } catch {
        // storage tidak tersedia, abaikan
    }
}
