import { Badge } from '@/components/ui/badge';
import { type ApiEndpointParam } from '@/types/api-docs';

export function ApiParamsTable({ params }: { params: readonly ApiEndpointParam[] }) {
    if (params.length === 0) {
        return <p className="text-muted-foreground text-xs">Tidak ada parameter.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-muted/50 border-b">
                        <th className="text-muted-foreground w-24 pb-2 text-left font-medium">Nama</th>
                        <th className="text-muted-foreground w-20 pb-2 text-left font-medium">Lokasi</th>
                        <th className="text-muted-foreground w-20 pb-2 text-left font-medium">Tipe</th>
                        <th className="text-muted-foreground w-16 pb-2 text-left font-medium">Wajib</th>
                        <th className="text-muted-foreground pb-2 text-left font-medium">Deskripsi</th>
                    </tr>
                </thead>
                <tbody>
                    {params.map((param) => (
                        <tr key={param.name} className="border-muted/50 border-b last:border-0">
                            <td className="pb-3 font-mono text-xs">{param.name}</td>
                            <td className="pb-3 text-xs">
                                <Badge variant="outline" className="h-5 w-fit px-1.5">
                                    {param.location}
                                </Badge>
                            </td>
                            <td className="pb-3 font-mono text-xs">{param.type}</td>
                            <td className="pb-3 text-xs">
                                {param.required ? (
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">Ya</span>
                                ) : (
                                    <span className="text-muted-foreground">Tidak</span>
                                )}
                            </td>
                            <td className="pb-3 text-xs">{param.description}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
