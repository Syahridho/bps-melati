import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    FileText,
    Image as ImageIcon,
    LoaderCircle,
    Maximize2,
    Minimize2,
    Paperclip,
    RotateCcw,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface PreviewAttachmentItem {
    id?: number | string;
    name?: string;
    original_name?: string;
    size?: number;
    mime_type?: string | null;
    mimeType?: string | null;
    url?: string;
    file?: File;
}

export type AttachmentPreviewSource = File | PreviewAttachmentItem;

interface AttachmentPreviewDialogProps {
    open?: boolean;
    item?: AttachmentPreviewSource | null;
    items?: AttachmentPreviewSource[];
    initialIndex?: number;
    onClose: () => void;
}

function formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getItemInfo(item?: AttachmentPreviewSource | null) {
    if (!item) {
        return { name: '', size: 0, mime: '', url: null };
    }

    if (item instanceof File) {
        return {
            name: item.name,
            size: item.size,
            mime: item.type,
            url: null,
        };
    }

    return {
        name: item.name || item.original_name || 'lampiran',
        size: item.size || (item.file ? item.file.size : 0),
        mime: item.mime_type || item.mimeType || (item.file ? item.file.type : ''),
        url: item.url || null,
    };
}

function isImage(name: string, mime?: string | null): boolean {
    if (mime && mime.startsWith('image/')) return true;
    const lower = name.toLowerCase();
    return (
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.gif') ||
        lower.endsWith('.svg')
    );
}

function isPdf(name: string, mime?: string | null): boolean {
    if (mime === 'application/pdf') return true;
    return name.toLowerCase().endsWith('.pdf');
}

export function AttachmentPreviewDialog({ open, item, items, initialIndex = 0, onClose }: AttachmentPreviewDialogProps) {
    const list = useMemo(() => {
        if (items && items.length > 0) return items;
        return item ? [item] : [];
    }, [items, item]);

    const isOpen = open !== undefined ? open : !!item || (items && items.length > 0);

    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        if (item && list.length > 0) {
            const idx = list.findIndex((candidate) => candidate === item);
            if (idx !== -1) {
                setCurrentIndex(idx);
                return;
            }
        }
        if (initialIndex >= 0 && initialIndex < list.length) {
            setCurrentIndex(initialIndex);
        } else {
            setCurrentIndex(0);
        }
    }, [item, list, initialIndex]);

    const activeSource = list[currentIndex];
    const { name, size, mime, url } = useMemo(() => getItemInfo(activeSource), [activeSource]);

    // Manajemen URL blob agar aman dari memory leak
    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !activeSource) {
            setBlobUrl(null);
            return;
        }

        const targetFile = activeSource instanceof File ? activeSource : activeSource.file;
        if (targetFile instanceof File) {
            const objectUrl = URL.createObjectURL(targetFile);
            setBlobUrl(objectUrl);
            return () => {
                URL.revokeObjectURL(objectUrl);
            };
        }

        setBlobUrl(null);
    }, [activeSource, isOpen]);

    const activeUrl = blobUrl || url || '';

    // Viewer states
    const [isLoading, setIsLoading] = useState(true);
    const [zoom, setZoom] = useState(100);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsLoading(true);
        setZoom(100);
    }, [currentIndex, activeUrl]);

    // Fullscreen API listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement !== null);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }, []);

    // Navigasi keyboard (Arrow Left / Right, Escape)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : list.length - 1));
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setCurrentIndex((prev) => (prev < list.length - 1 ? prev + 1 : 0));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, list.length]);

    const handlePrev = useCallback(() => {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : list.length - 1));
    }, [list.length]);

    const handleNext = useCallback(() => {
        setCurrentIndex((prev) => (prev < list.length - 1 ? prev + 1 : 0));
    }, [list.length]);

    const isImageFile = isImage(name, mime);
    const isPdfFile = isPdf(name, mime);

    // Zoom handlers
    const zoomIn = () => setZoom((prev) => Math.min(400, prev + 25));
    const zoomOut = () => setZoom((prev) => Math.max(50, prev - 25));
    const resetZoom = () => setZoom(100);
    const toggleFit = () => setZoom((prev) => (prev === 100 ? 200 : 100));

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
        }
    };

    if (!isOpen || !activeSource) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                ref={containerRef}
                className="bg-background fixed top-[50%] left-[50%] z-50 flex h-[100dvh] w-screen max-w-none translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-none border-none p-0 shadow-2xl sm:h-[92dvh] sm:w-[96vw] sm:max-w-[96vw] sm:rounded-xl [&>button]:hidden"
            >
                <DialogTitle className="sr-only">Pratinjau Berkas: {name}</DialogTitle>

                {/* Header Toolbar */}
                <div className="bg-card flex h-14 shrink-0 items-center justify-between border-b px-3 sm:px-4">
                    {/* Sisi Kiri: Ikon, Nama File, Ukuran, Navigasi Indikator */}
                    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                        <div className="shrink-0">
                            {isImageFile ? (
                                <ImageIcon className="h-5 w-5 text-blue-500" />
                            ) : isPdfFile ? (
                                <FileText className="h-5 w-5 text-red-500" />
                            ) : (
                                <Paperclip className="text-muted-foreground h-5 w-5" />
                            )}
                        </div>

                        <div className="flex min-w-0 flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-foreground max-w-[200px] truncate text-xs font-semibold sm:max-w-md sm:text-sm" title={name}>
                                    {name}
                                </span>
                                {list.length > 1 && (
                                    <span className="bg-muted text-muted-foreground inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium sm:text-xs">
                                        {currentIndex + 1} / {list.length}
                                    </span>
                                )}
                            </div>
                            {size > 0 && <span className="text-muted-foreground text-[10px] sm:text-xs">{formatFileSize(size)}</span>}
                        </div>
                    </div>

                    {/* Sisi Kanan: Aksi (Zoom, Navigasi, Tab Baru, Unduh, Fullscreen, Tutup) */}
                    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                        {/* Navigasi Antar File (Bila > 1) */}
                        {list.length > 1 && (
                            <div className="mr-1 hidden items-center gap-0.5 sm:flex">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handlePrev}
                                    className="h-8 w-8"
                                    title="Sebelumnya (Panah Kiri)"
                                    aria-label="Sebelumnya"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleNext}
                                    className="h-8 w-8"
                                    title="Berikutnya (Panah Kanan)"
                                    aria-label="Berikutnya"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {/* Kontrol Zoom Khusus Gambar */}
                        {isImageFile && (
                            <div className="bg-muted/40 mr-1 hidden items-center gap-1 rounded-md border px-1 py-0.5 md:flex">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={zoomOut}
                                    className="h-7 w-7"
                                    disabled={zoom <= 50}
                                    title="Perkecil"
                                    aria-label="Perkecil"
                                >
                                    <ZoomOut className="h-3.5 w-3.5" />
                                </Button>
                                <span className="w-11 text-center font-mono text-[11px] font-medium select-none">{zoom}%</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={zoomIn}
                                    className="h-7 w-7"
                                    disabled={zoom >= 400}
                                    title="Perbesar"
                                    aria-label="Perbesar"
                                >
                                    <ZoomIn className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={resetZoom}
                                    className="h-7 w-7 text-xs"
                                    title="Atur Ulang (100%)"
                                    aria-label="Atur Ulang"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}

                        {/* Buka di Tab Baru */}
                        {activeUrl && (
                            <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                className="h-8 w-8 sm:h-9 sm:w-9"
                                title="Buka di tab baru"
                                aria-label="Buka di tab baru"
                            >
                                <a href={activeUrl} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        )}

                        {/* Unduh File */}
                        {activeUrl && (
                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 sm:h-9 sm:w-9" title="Unduh file" aria-label="Unduh file">
                                <a href={activeUrl} download={name}>
                                    <Download className="h-4 w-4" />
                                </a>
                            </Button>
                        )}

                        {/* Layar Penuh (Fullscreen API) */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleFullscreen}
                            className="hidden h-8 w-8 sm:inline-flex sm:h-9 sm:w-9"
                            title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
                            aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>

                        {/* Tombol Tutup */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                            className="hover:bg-destructive/10 hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
                            title="Tutup (Esc)"
                            aria-label="Tutup"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Body Viewer */}
                <div
                    className="bg-muted/40 relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
                    onWheel={isImageFile ? handleWheel : undefined}
                >
                    {/* Tombol Navigasi Mengambang di Tepi (Mobile & Desktop) */}
                    {list.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={handlePrev}
                                className="bg-background/80 text-foreground hover:bg-background absolute top-1/2 left-2 z-20 -translate-y-1/2 rounded-full border p-2 shadow-md backdrop-blur-sm transition-all hover:scale-110 focus:outline-hidden"
                                title="Sebelumnya"
                                aria-label="Sebelumnya"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={handleNext}
                                className="bg-background/80 text-foreground hover:bg-background absolute top-1/2 right-2 z-20 -translate-y-1/2 rounded-full border p-2 shadow-md backdrop-blur-sm transition-all hover:scale-110 focus:outline-hidden"
                                title="Berikutnya"
                                aria-label="Berikutnya"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    )}

                    {/* 1. PDF Viewer */}
                    {isPdfFile && activeUrl && (
                        <div className="relative h-full w-full">
                            {isLoading && (
                                <div className="bg-background/80 absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
                                    <LoaderCircle className="text-primary h-8 w-8 animate-spin" />
                                    <p className="text-muted-foreground text-xs font-medium">Memuat pratinjau PDF...</p>
                                </div>
                            )}

                            {/* Banner mobile untuk buka tab baru bila diperlukan */}
                            <div className="bg-muted/90 flex items-center justify-between border-b px-3 py-1.5 text-xs sm:hidden">
                                <span className="text-muted-foreground truncate text-[11px]">Buka tab baru jika PDF tidak tampil</span>
                                <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                                    <a href={activeUrl} target="_blank" rel="noopener noreferrer">
                                        Buka Tab Baru
                                    </a>
                                </Button>
                            </div>

                            <iframe
                                key={activeUrl}
                                src={`${activeUrl}#toolbar=1&navpanes=0&view=FitH`}
                                title={name}
                                className="bg-background h-full w-full border-0"
                                onLoad={() => setIsLoading(false)}
                            />
                        </div>
                    )}

                    {/* 2. Image Viewer */}
                    {isImageFile && activeUrl && (
                        <div
                            className="flex h-full w-full items-center justify-center overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] p-4 select-none dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]"
                            onDoubleClick={toggleFit}
                            title="Klik dua kali untuk perbesar / sesuaikan"
                        >
                            {isLoading && (
                                <div className="bg-background/80 absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
                                    <LoaderCircle className="text-primary h-8 w-8 animate-spin" />
                                </div>
                            )}
                            <img
                                key={activeUrl}
                                src={activeUrl}
                                alt={name}
                                onLoad={() => setIsLoading(false)}
                                style={{
                                    transform: `scale(${zoom / 100})`,
                                    transformOrigin: 'center center',
                                }}
                                className="max-h-full max-w-full cursor-zoom-in rounded object-contain transition-transform duration-150"
                            />
                        </div>
                    )}

                    {/* 3. Fallback bila bukan PDF atau Gambar */}
                    {!isImageFile && !isPdfFile && (
                        <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                            <div className="bg-muted rounded-full p-4">
                                <Paperclip className="text-muted-foreground h-10 w-10" />
                            </div>
                            <div>
                                <p className="text-foreground text-sm font-semibold">{name}</p>
                                <p className="text-muted-foreground mt-1 text-xs">Pratinjau tidak tersedia untuk tipe berkas ini.</p>
                            </div>
                            {activeUrl && (
                                <Button asChild className="gap-2">
                                    <a href={activeUrl} download={name}>
                                        <Download className="h-4 w-4" />
                                        Unduh Berkas ({formatFileSize(size)})
                                    </a>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
