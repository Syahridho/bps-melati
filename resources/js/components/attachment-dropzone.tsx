import { Button } from '@/components/ui/button';
import {
    formatFileSize,
    isImageFile,
    isPdfFile,
    validateAttachments,
} from '@/lib/welcome-utils';
import { cn } from '@/lib/utils';
import { Eye, FileText, Paperclip, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type DragEvent,
} from 'react';

interface AttachmentDropzoneProps {
    files: File[];
    onChange: (files: File[]) => void;
    onRemoveFile: (index: number) => void;
    onPreviewFile?: (file: File) => void;
    maxFiles?: number;
    maxSizeMB?: number;
    accept?: string;
    disabled?: boolean;
    error?: string | null;
}

export function AttachmentDropzone({
    files,
    onChange,
    onRemoveFile,
    onPreviewFile,
    maxFiles = 3,
    maxSizeMB = 2,
    accept = '.pdf,.jpg,.jpeg,.png',
    disabled = false,
    error = null,
}: AttachmentDropzoneProps) {
    const [isDragActive, setIsDragActive] = useState(false);
    const dragCount = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const previewUrls = useRef<Map<string, string>>(new Map());

    // Cegah browser membuka file saat file diserahkan di luar area (window).
    useEffect(() => {
        const prevent = (e: Event) => e.preventDefault();
        window.addEventListener('dragover', prevent);
        window.addEventListener('drop', prevent);
        return () => {
            window.removeEventListener('dragover', prevent);
            window.removeEventListener('drop', prevent);
        };
    }, []);

    // Cabut URL objek saat komponen dilepas dari DOM agar tidak bocor memori.
    useEffect(() => {
        const urls = previewUrls.current;
        return () => {
            urls.forEach((url) => URL.revokeObjectURL(url));
            urls.clear();
        };
    }, []);

    const fileKey = useCallback(
        (file: File) => `${file.name}-${file.size}-${file.lastModified}`,
        []
    );

    const getPreviewUrl = useCallback(
        (file: File): string | null => {
            if (!isImageFile(file)) {
                return null;
            }
            const key = fileKey(file);
            let url = previewUrls.current.get(key);
            if (!url) {
                url = URL.createObjectURL(file);
                previewUrls.current.set(key, url);
            }
            return url;
        },
        [fileKey]
    );

    const revokePreview = useCallback(
        (file: File) => {
            const key = fileKey(file);
            const url = previewUrls.current.get(key);
            if (url) {
                URL.revokeObjectURL(url);
                previewUrls.current.delete(key);
            }
        },
        [fileKey]
    );

    const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCount.current += 1;
        if (!isDragActive && !disabled) {
            setIsDragActive(true);
        }
    };

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCount.current -= 1;
        if (dragCount.current <= 0) {
            dragCount.current = 0;
            setIsDragActive(false);
        }
    };

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCount.current = 0;
        setIsDragActive(false);
        if (disabled) {
            return;
        }
        handleFiles(Array.from(e.dataTransfer.files ?? []));
    };

    const handleFiles = (newFiles: File[]) => {
        const { accepted, rejected } = validateAttachments(newFiles, {
            existingFiles: files,
            maxFiles,
            maxSizeMB,
            accept,
        });

        for (const { reason } of rejected) {
            toast.error(reason);
        }

        if (accepted.length > 0) {
            onChange([...files, ...accepted]);
        }
    };

    const handleClick = () => {
        if (disabled) {
            return;
        }
        fileInputRef.current?.click();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        handleFiles(Array.from(e.target.files ?? []));
        e.target.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            fileInputRef.current?.click();
        }
    };

    const isFull = files.length >= maxFiles;

    return (
        <div className="space-y-3">
            <input
                ref={fileInputRef}
                id="file-input"
                type="file"
                className="hidden"
                multiple
                accept={accept}
                onChange={handleInputChange}
                disabled={disabled || isFull}
            />

            {error && (
                <p className="text-destructive text-xs" aria-live="polite">
                    {error}
                </p>
            )}

            <div
                role="button"
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onClick={handleClick}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                    'border rounded-lg flex flex-col items-center justify-center gap-2 px-4 py-4 text-sm transition-all duration-200',
                    disabled || isFull
                        ? 'border-dashed border-muted cursor-not-allowed opacity-60'
                        : isDragActive
                        ? 'border-primary bg-primary/5 border-2'
                        : 'border-dashed border-border cursor-pointer hover:border-primary hover:bg-primary/5',
                )}
                aria-label={
                    isFull
                        ? 'Batas maksimal lampiran tercapai'
                        : 'Seret dan lepas file lampiran, atau klik untuk memilih'
                }
                aria-disabled={disabled || isFull}
            >
                {isFull ? (
                    <>
                        <UploadCloud className="size-6 opacity-50" />
                        <p className="text-muted-foreground text-xs">
                            Batas maksimal {maxFiles} file tercapai
                        </p>
                    </>
                ) : isDragActive ? (
                    <>
                        <UploadCloud className="size-5 text-primary" />
                        <p className="text-sm font-medium text-primary">
                            Lepaskan file di sini
                        </p>
                    </>
                ) : (
                    <>
                        <Paperclip className="size-5" />
                        <p className="text-sm">
                            Seret &amp; lepas file di sini, atau klik untuk
                            memilih ({files.length}/{maxFiles})
                        </p>
                    </>
                )}
            </div>

            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file, index) => {
                        const previewUrl = isImageFile(file)
                            ? getPreviewUrl(file)
                            : null;
                        return (
                            <div
                                key={`${file.name}-${index}`}
                                className="bg-accent/40 flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs"
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    {previewUrl ? (
                                        <img
                                            src={previewUrl}
                                            alt={file.name}
                                            className="size-6 rounded object-cover shrink-0"
                                        />
                                    ) : (
                                        <>
                                            {isPdfFile(file) ? (
                                                <FileText className="size-4 shrink-0" />
                                            ) : (
                                                <Paperclip className="size-4 shrink-0" />
                                            )}
                                            <span className="truncate font-medium">
                                                {file.name}
                                            </span>
                                        </>
                                    )}
                                    <span className="text-muted-foreground shrink-0">
                                        ({formatFileSize(file.size)})
                                    </span>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                    {previewUrl && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="size-7"
                                            title="Pratinjau"
                                            onClick={() => onPreviewFile?.(file)}
                                        >
                                            <Eye className="size-3.5" />
                                        </Button>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive size-7"
                                        title="Hapus"
                                        onClick={() => {
                                            revokePreview(file);
                                            onRemoveFile(index);
                                        }}
                                    >
                                        <X className="size-3.5" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
