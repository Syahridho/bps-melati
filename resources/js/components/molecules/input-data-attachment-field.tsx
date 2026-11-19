import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatFileSize, isImageFile } from '@/lib/input-data-utils';
import { Eye, FileText, Image as ImageIcon, Paperclip, X } from 'lucide-react';
import { ChangeEvent, useRef } from 'react';

interface InputDataAttachmentFieldProps {
    id: string;
    label: string;
    description?: string;
    files: File[];
    error?: string;
    onChange: (files: FileList | null) => void;
    onRemove: (file: File) => void;
    onPreview: (file: File) => void;
}

export function InputDataAttachmentField({ id, label, description, files, error, onChange, onRemove, onPreview }: InputDataAttachmentFieldProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.files);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            {description && <p className="text-muted-foreground text-xs">{description}</p>}

            {files.length < 3 && (
                <div>
                    <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.pdf" multiple onChange={handleChange} className="hidden" id={id} />
                    <Button type="button" variant="outline" size="sm" className="min-h-[40px]" onClick={() => fileInputRef.current?.click()}>
                        <Paperclip className="mr-2 h-4 w-4" />
                        Pilih File
                    </Button>
                </div>
            )}

            {files.length > 0 && (
                <div className="space-y-2 pt-2">
                    {files.map((file, index) => (
                        <div key={index} className="bg-background flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                            <div className="flex min-w-0 items-center gap-2 truncate">
                                {isImageFile(file) ? (
                                    <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                                ) : (
                                    <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                )}
                                <span className="min-w-0 truncate font-medium">{file.name}</span>
                                <span className="text-muted-foreground shrink-0">({formatFileSize(file.size)})</span>
                            </div>
                            <div className="ml-2 flex shrink-0 items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-foreground h-10 w-10"
                                    onClick={() => onPreview(file)}
                                    title="Lihat Pratinjau"
                                    aria-label={`Pratinjau ${file.name}`}
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10"
                                    onClick={() => onRemove(file)}
                                    title="Hapus File"
                                    aria-label={`Hapus ${file.name}`}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
    );
}

// Re-export as AttachmentField for backward compatibility with external imports
export { InputDataAttachmentField as AttachmentField };
