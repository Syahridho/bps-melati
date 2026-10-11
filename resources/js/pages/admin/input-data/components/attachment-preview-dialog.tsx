import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useEffect, useMemo } from 'react';
import { isImageFile, isPdfFile } from '../utils';

interface AttachmentPreviewDialogProps {
    file: File | null;
    onClose: () => void;
}

export function AttachmentPreviewDialog({ file, onClose }: AttachmentPreviewDialogProps) {
    const previewUrl = useMemo(() => {
        if (!file) return null;
        return URL.createObjectURL(file);
    }, [file]);

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    return (
        <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] overflow-hidden border-none bg-black/95 p-0 lg:max-w-4xl">
                <DialogTitle className="sr-only">Pratinjau File: {file?.name}</DialogTitle>
                <div className="relative flex h-[85dvh] w-full items-center justify-center">
                    {file && previewUrl && isImageFile(file) && (
                        <img src={previewUrl} alt={file.name} className="max-h-full max-w-full object-contain" />
                    )}
                    {file && previewUrl && isPdfFile(file) && <iframe src={previewUrl} className="h-full w-full border-0" title={file.name} />}
                    {file && !isImageFile(file) && !isPdfFile(file) && (
                        <div className="text-center text-white">
                            <p className="mb-4">Pratinjau tidak tersedia untuk tipe file ini.</p>
                            <a href={previewUrl || '#'} download={file.name} className="text-blue-400 hover:underline">
                                Unduh File
                            </a>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
