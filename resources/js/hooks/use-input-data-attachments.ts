import { isImageFile, isPdfFile } from '@/lib/input-data-utils';
import { useCallback } from 'react';
import { toast } from 'sonner';

export function useInputDataAttachments(maxFiles: number = 3, maxSizeBytes: number = 2 * 1024 * 1024) {
    const handleFileSelection = useCallback(
        (currentFiles: File[], selectedFiles: FileList | null): File[] => {
            if (!selectedFiles) return currentFiles;

            const newFiles = Array.from(selectedFiles);
            let validFiles: File[] = [];

            for (const file of newFiles) {
                if (file.size > maxSizeBytes) {
                    toast.error(`File "${file.name}" terlalu besar (maksimal ${maxSizeBytes / (1024 * 1024)}MB).`);
                    continue;
                }
                if (!isImageFile(file) && !isPdfFile(file)) {
                    toast.error(`File "${file.name}" ditolak. Hanya format JPG, PNG, atau PDF yang diizinkan.`);
                    continue;
                }
                validFiles.push(file);
            }

            const totalAfterAdd = currentFiles.length + validFiles.length;
            if (totalAfterAdd > maxFiles) {
                toast.error(`Maksimal ${maxFiles} file. Hanya beberapa file yang ditambahkan.`);
                validFiles = validFiles.slice(0, maxFiles - currentFiles.length);
            }

            return [...currentFiles, ...validFiles];
        },
        [maxFiles, maxSizeBytes],
    );

    const removeFile = useCallback((currentFiles: File[], fileToRemove: File): File[] => {
        return currentFiles.filter((file) => file !== fileToRemove);
    }, []);

    return { handleFileSelection, removeFile };
}
