import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Ticket } from 'lucide-react';
import { type FormEvent } from 'react';

interface CheckSearchCardProps {
    inputQuery: string;
    onInputChange: (value: string) => void;
    onSubmit: (e: FormEvent) => void;
}

export function CheckSearchCard({ inputQuery, onInputChange, onSubmit }: CheckSearchCardProps) {
    return (
        <Card className="border shadow-sm">
            <CardHeader className="pb-4 text-center">
                <div className="bg-primary/10 text-primary mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
                    <Ticket className="size-6" aria-hidden="true" />
                </div>
                <CardTitle className="text-2xl font-bold">Lacak & Cek Status Laporan</CardTitle>
                <CardDescription className="text-sm">Masukkan kode tiket laporan Anda</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                        <div className="relative w-full flex-1">
                            <Search className="text-muted-foreground absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
                            <Input
                                type="text"
                                placeholder="Masukkan kode tiket..."
                                className="h-11 pl-10 font-mono text-base uppercase"
                                value={inputQuery}
                                onChange={(e) => onInputChange(e.target.value)}
                                required
                            />
                        </div>
                        <Button type="submit" size="lg" className="h-11 w-full px-6 font-medium sm:w-auto">
                            Cek Status
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
