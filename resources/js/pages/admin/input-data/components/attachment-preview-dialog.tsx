import { AttachmentPreviewDialog as BaseAttachmentPreviewDialog, type AttachmentPreviewSource } from '@/components/attachment-preview-dialog';

interface AttachmentPreviewDialogProps {
    file?: AttachmentPreviewSource | null;
    item?: AttachmentPreviewSource | null;
    items?: AttachmentPreviewSource[];
    onClose: () => void;
}

export function AttachmentPreviewDialog({ file, item, items, onClose }: AttachmentPreviewDialogProps) {
    return <BaseAttachmentPreviewDialog item={file || item} items={items} onClose={onClose} />;
}
