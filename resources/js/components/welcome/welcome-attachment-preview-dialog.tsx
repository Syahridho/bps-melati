import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatFileSize, isImageFile, isPdfFile } from '@/lib/welcome-utils';

interface WelcomeAttachmentPreviewDialogProps {
    file: File | null;
    previewUrl: string | null;
    onClose: () => void;
}

export function WelcomeAttachmentPreviewDialog({ file, previewUrl, onClose }: WelcomeAttachmentPreviewDialogProps) {
    return (
        <Dialog open={!!file} onOpenChange={() => onClose()}>
            <DialogContent className="max-h-[90vh] sm:max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="truncate pr-6">{file?.name}</DialogTitle>
                    <DialogDescription>{file && formatFileSize(file.size)}</DialogDescription>
                </DialogHeader>

                <div className="max-h-[70vh] overflow-auto">
                    {file && previewUrl && isImageFile(file) && (
                        <img src={previewUrl} alt={file.name} className="mx-auto max-h-[65vh] rounded-md object-contain" />
                    )}

                    {file && previewUrl && isPdfFile(file) && (
                        <iframe src={previewUrl} title={file.name} className="h-[65vh] w-full rounded-md border-0" />
                    )}
                </div>

                <DialogFooter>
                    <Button onClick={onClose} className="w-full sm:w-auto">
                        Tutup
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
