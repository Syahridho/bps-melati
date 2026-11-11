import RekapPrintSkeleton from '@/components/rekap/rekap-print-skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { REKAP_PRINT_FRAME_ID } from '@/lib/rekap-constants';
import { cn } from '@/lib/utils';
import { ChevronDown, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
interface RekapPrintActionsProps {
    excelUrl: string;
    printUrl: string;
    exportOpen: boolean;
    onExportOpenChange: (open: boolean) => void;
    onPrint: () => void;
    /** Judul dialog, contoh: `Export PDF — Rekap Bulanan`. */
    dialogTitle: string;
    /** Judul pratinjau iframe, contoh: `Pratinjau rekap Bulanan`. */
    frameTitle: string;
    /** Id iframe pratinjau; default `rekap-print-frame`. */
    frameId?: string;
    /** Deskripsi dialog; default dipakai rekap bulanan. */
    dialogDescription?: string;
    /** Class tambahan untuk dialog; default lebar 90vw, tinggi maks 90vh. */
    dialogContentClassName?: string;
    /** Class tambahan untuk area pratinjau (scroll container). */
    frameClassName?: string;
}

export function RekapPrintActions({
    excelUrl,
    printUrl,
    exportOpen,
    onExportOpenChange,
    onPrint,
    dialogTitle,
    frameTitle,
    frameId = REKAP_PRINT_FRAME_ID,
    dialogDescription = 'Pratinjau di bawah adalah dokumen yang akan dicetak, lengkap dengan kop surat. Gunakan tombol Cetak lalu pilih “Save as PDF” pada dialog printer untuk menyimpan berkas.',
    dialogContentClassName,
    frameClassName,
}: RekapPrintActionsProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [frameHeight, setFrameHeight] = useState<number>();
    const [frameLoading, setFrameLoading] = useState(true);
    const observerRef = useRef<ResizeObserver | null>(null);
    useEffect(() => {
        if (!exportOpen) {
            observerRef.current?.disconnect();
            observerRef.current = null;
            setFrameHeight(undefined);
            setFrameLoading(true); // reset untuk pembukaan berikutnya
        }
        return () => observerRef.current?.disconnect();
    }, [exportOpen]);
    // Bersihkan observer saat dialog ditutup atau komponen unmount
    useEffect(() => {
        if (!exportOpen) {
            observerRef.current?.disconnect();
            observerRef.current = null;
            setFrameHeight(undefined);
        }
        return () => observerRef.current?.disconnect();
    }, [exportOpen]);
    useEffect(() => {
        setFrameLoading(true);
        setFrameHeight(undefined);
    }, [printUrl]);

    return (
        <>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    <Button>
                        <Download className="mr-1.5 h-4 w-4" />
                        Export
                        <ChevronDown className="ml-1.5 h-4 w-4 opacity-70" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem
                        onSelect={() => {
                            setDropdownOpen(false);
                            // Beri waktu browser menyelesaikan unmount dropdown menu sebelum modal dialog render
                            setTimeout(() => onExportOpenChange(true), 50);
                        }}
                    >
                        <FileText className="mr-2 h-4 w-4 text-red-500" />
                        Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <a href={excelUrl} download>
                            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                            Export Excel
                        </a>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog
                open={exportOpen}
                onOpenChange={(open) => {
                    onExportOpenChange(open);
                    if (!open) {
                        // Pastikan pointer-events di-reset jika Radix UI sempat tertinggal
                        setTimeout(() => {
                            document.body.style.pointerEvents = '';
                        }, 50);
                    }
                }}
            >
                <DialogContent
                    className={cn('flex max-h-[90vh] max-w-[90vw] flex-col gap-4 overflow-hidden sm:max-w-[90vw]', dialogContentClassName)}
                >
                    <DialogHeader className="shrink-0">
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        <DialogDescription>{dialogDescription}</DialogDescription>
                    </DialogHeader>

                    {exportOpen && (
                        <div
                            className={cn(
                                'relative min-h-0 flex-1 overflow-y-auto rounded-md border bg-white p-6',
                                frameLoading && 'min-h-[60vh]',
                                frameClassName,
                            )}
                        >
                            {frameLoading && (
                                <div className="absolute inset-0 z-10 overflow-hidden bg-white p-6">
                                    <RekapPrintSkeleton />
                                </div>
                            )}

                            <iframe
                                key={printUrl}
                                id={frameId}
                                src={printUrl}
                                title={frameTitle}
                                scrolling="no"
                                className={cn('block w-full bg-white transition-opacity duration-200', frameLoading ? 'opacity-0' : 'opacity-100')}
                                style={{ height: frameHeight }}
                                onLoad={(e) => {
                                    const doc = e.currentTarget.contentDocument;
                                    if (!doc) {
                                        setFrameLoading(false);
                                        return;
                                    }

                                    const resize = () => setFrameHeight(Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight));
                                    resize();
                                    setFrameLoading(false);

                                    observerRef.current?.disconnect();
                                    observerRef.current = new ResizeObserver(resize);
                                    observerRef.current.observe(doc.documentElement);
                                }}
                            />
                        </div>
                    )}

                    <DialogFooter className="shrink-0">
                        <Button onClick={onPrint}>
                            <Printer />
                            Cetak / Simpan PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
