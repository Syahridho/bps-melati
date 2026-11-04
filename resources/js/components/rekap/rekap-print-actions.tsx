import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { REKAP_PRINT_FRAME_ID } from '@/lib/rekap-constants';
import { ChevronDown, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { useState } from 'react';

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
    /** Lebar dialog; default `max-w-4xl`. */
    dialogContentClassName?: string;
    /** Tinggi iframe; default `h-[60vh]`. */
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
    dialogContentClassName = 'max-w-4xl',
    frameClassName = 'h-[60vh]',
}: RekapPrintActionsProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);

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
                <DialogContent className={dialogContentClassName}>
                    <DialogHeader>
                        <DialogTitle>{dialogTitle}</DialogTitle>
                        <DialogDescription>{dialogDescription}</DialogDescription>
                    </DialogHeader>

                    {exportOpen && (
                        <iframe
                            key={printUrl}
                            id={frameId}
                            src={printUrl}
                            title={frameTitle}
                            className={`${frameClassName} w-full rounded-md border bg-white`}
                        />
                    )}

                    <DialogFooter>
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
