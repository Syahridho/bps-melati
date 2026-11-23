import { API_ERROR_CODES } from '@/lib/api-docs';

export function ApiErrorCodesTable() {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-muted/50 border-b">
                        <th className="text-muted-foreground w-16 pb-2 text-left font-medium">Kode</th>
                        <th className="text-muted-foreground w-24 pb-2 text-left font-medium">Nama</th>
                        <th className="text-muted-foreground pb-2 text-left font-medium">Deskripsi</th>
                        <th className="text-muted-foreground w-32 pb-2 text-left font-medium">Contoh Body</th>
                        <th className="text-muted-foreground pb-2 text-left font-medium">Catatan</th>
                    </tr>
                </thead>
                <tbody>
                    {API_ERROR_CODES.map((err) => (
                        <tr key={err.code} className="border-muted/50 border-b last:border-0">
                            <td className="pb-3 font-mono text-xs">{err.code}</td>
                            <td className="pb-3 text-xs font-medium">{err.name}</td>
                            <td className="pb-3 text-xs">{err.description}</td>
                            <td className="text-muted-foreground max-w-40 truncate pb-3 font-mono text-xs">{err.exampleBody}</td>
                            <td className="pb-3 text-xs">{err.note ?? '-'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
