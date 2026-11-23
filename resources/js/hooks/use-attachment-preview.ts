import { useState } from 'react';

import type { AttachmentPreviewSource } from '@/components/molecules/attachment-preview-dialog';
import type { Attachment } from '@/types/check';

export function useAttachmentPreview() {
    const [items, setItems] = useState<AttachmentPreviewSource[]>([]);
    const [index, setIndex] = useState(0);
    const [open, setOpen] = useState(false);

    const preview = (attachment: Attachment, list: Attachment[] = []) => {
        setItems(list.length > 0 ? list : [attachment]);
        setIndex(0);
        setOpen(true);
    };

    return { items, index, open, preview, close: () => setOpen(false) };
}
