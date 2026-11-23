import { useState } from 'react';

import type { AttachmentPreviewSource } from '@/components/molecules/attachment-preview-dialog';

export function useAttachmentPreviewItem() {
    const [item, setItem] = useState<AttachmentPreviewSource | null>(null);
    const [items, setItems] = useState<AttachmentPreviewSource[]>([]);

    const preview = (target: AttachmentPreviewSource, list: AttachmentPreviewSource[] = []) => {
        setItem(target);
        setItems(list);
    };

    const close = () => {
        setItem(null);
        setItems([]);
    };

    return { item, items, preview, close };
}
