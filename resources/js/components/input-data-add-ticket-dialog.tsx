import { AttachmentPreviewDialog } from '@/components/attachment-preview-dialog';
import { InputDataResponseFormBlock } from '@/components/input-data-response-form-block';
import { InputDataTicketFormBlock } from '@/components/input-data-ticket-form-block';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useInputDataAddTicketForm } from '@/hooks/use-input-data-add-ticket-form';
import { cn } from '@/lib/utils';
import { type ChannelGroup } from '@/types/input-data';
import { LoaderCircle, Send } from 'lucide-react';
import { useRef } from 'react';

interface InputDataAddTicketDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    channels: ChannelGroup[];
    routePrefix: string;
}

export function InputDataAddTicketDialog({ open, onOpenChange, channels, routePrefix }: InputDataAddTicketDialogProps) {
    const bodyRef = useRef<HTMLDivElement>(null);

    const {
        data,
        setData,
        errors,
        processing,
        showResponsePanel,
        setShowResponsePanel,
        previewFile,
        setPreviewFile,
        responseRef,
        handleTicketFileChange,
        handleTicketFileRemove,
        handleResponseFileChange,
        handleResponseFileRemove,
        handleSubmit,
        handleOpenChange,
    } = useInputDataAddTicketForm({ routePrefix, onOpenChange });

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    className={cn(
                        'flex max-h-[92dvh] min-h-0 w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden p-0 transition-all duration-300',
                        showResponsePanel ? 'lg:max-w-6xl' : 'sm:max-w-2xl',
                    )}
                >
                    <DialogHeader className="bg-background z-20 shrink-0 border-b px-4 py-3 text-left sm:px-6 sm:py-4">
                        <DialogTitle>Tambah Data Baru</DialogTitle>
                        <DialogDescription className="text-xs sm:text-sm">
                            Isi formulir di bawah ini untuk menambahkan tiket pengaduan, aspirasi, atau permintaan informasi.
                        </DialogDescription>
                    </DialogHeader>

                    <form id="input-data-form" onSubmit={handleSubmit} autoComplete="off" className="flex min-h-0 flex-1 flex-col">
                        <div
                            ref={bodyRef}
                            className={cn(
                                'custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain',
                                showResponsePanel && 'lg:grid lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden',
                            )}
                        >
                            <InputDataTicketFormBlock
                                data={data}
                                setData={setData}
                                errors={errors}
                                channels={channels}
                                showResponsePanel={showResponsePanel}
                                setShowResponsePanel={setShowResponsePanel}
                                handleFileChange={handleTicketFileChange}
                                removeFile={handleTicketFileRemove}
                                setPreviewFile={setPreviewFile}
                            />

                            {showResponsePanel && (
                                <InputDataResponseFormBlock
                                    ref={responseRef}
                                    data={data}
                                    setData={setData}
                                    errors={errors}
                                    showResponsePanel={showResponsePanel}
                                    handleFileChange={handleResponseFileChange}
                                    removeFile={handleResponseFileRemove}
                                    setPreviewFile={setPreviewFile}
                                />
                            )}
                        </div>

                        <DialogFooter className="bg-background z-20 flex shrink-0 flex-row gap-2 border-t px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-4">
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="flex-1 sm:flex-none">
                                Batal
                            </Button>
                            <Button type="submit" form="input-data-form" disabled={processing} className="flex-[2] gap-2 sm:flex-none">
                                {processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                {showResponsePanel ? 'Simpan & Jawab' : 'Kirim'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AttachmentPreviewDialog item={previewFile} onClose={() => setPreviewFile(null)} />
        </>
    );
}

export { InputDataAddTicketDialog as AddTicketDialog };
