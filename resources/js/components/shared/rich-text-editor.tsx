'use client';

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import {
    Bold,
    Heading2,
    Heading3,
    Italic,
    Link as LinkIcon,
    List,
    ListOrdered,
    Quote,
    Redo,
    Strikethrough,
    Underline as UnderlineIcon,
    Undo,
} from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    minHeight?: string;
    id?: string;
}

const ALLOWED_LINK_PROTOCOLS = ['http:', 'https:', 'mailto:'];

function isAllowedLink(url: string): boolean {
    try {
        const parsed = new URL(url);
        return ALLOWED_LINK_PROTOCOLS.includes(parsed.protocol);
    } catch {
        return false;
    }
}

/**
 * Rich text editor berbasis Tiptak yang sinkron dengan useForm (Inertia).
 * Output selalu string HTML; editor kosong menghasilkan '' (bukan '<p></p>').
 * Link hanya menerima protokol http, https, mailto.
 */
export function RichTextEditor({
    value,
    onChange,
    placeholder = 'Uraikan detail laporan secara lengkap...',
    disabled = false,
    error,
    minHeight = '200px',
    id,
}: RichTextEditorProps) {
    const [linkUrl, setLinkUrl] = useState('');
    const [linkOpen, setLinkOpen] = useState(false);
    const editorRef = useRef<Editor | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
                },
            }),
            Underline,
            Placeholder.configure({
                placeholder,
            }),
            Link.configure({
                openOnClick: false,
                validate: (url: string) => isAllowedLink(url),
            }),
        ],
        content: value || '',
        editable: !disabled,
        autofocus: false,
        onUpdate: ({ editor: updEditor }) => {
            const html = updEditor.getHTML();
            // Editor kosong (hanya <p></p> atau <p><br></p>) dikembalikan sebagai string kosong.
            const isEmpty = /^<p>(<br>)?<\/p>$/i.test(html);
            onChange(isEmpty ? '' : html);
        },
        onFocus: () => {
            editorRef.current = editor;
        },
    } as Parameters<typeof useEditor>[0]);

    const isActive = useCallback(
        (name: string): boolean => {
            return editor?.isActive(name) ?? false;
        },
        [editor],
    );

    const toggleLink = useCallback(() => {
        if (!editor) return;
        if (editor.isActive('link')) {
            editor.chain().focus().unsetLink().run();
            setLinkOpen(false);
        } else {
            setLinkOpen(true);
        }
    }, [editor]);

    const handleLinkSave = useCallback(() => {
        if (!editor) return;
        if (!isAllowedLink(linkUrl)) return;
        editor.chain().focus().setLink({ href: linkUrl }).run();
        setLinkUrl('');
        setLinkOpen(false);
    }, [editor, linkUrl]);

    // Sinkronkan nilai eksternal (mis. saat modal edit dibuka dengan content tersimpan).
    useEffect(() => {
        if (editor && editor.getHTML() !== value) {
            editor.commands.setContent(value || '');
        }
    }, [editor, value]);

    const toolbarDisabled = disabled || !editor;

    return (
        <div className="space-y-1" id={id ? `${id}-editor` : undefined}>
            {/* Toolbar */}
            <div
                className={cn(
                    'bg-background flex flex-wrap items-center gap-1 rounded-md border p-1 outline-none',
                    error ? 'border-destructive focus-within:border-destructive' : 'border-input focus-within:border-ring',
                )}
            >
                <Toggle
                    disabled={toolbarDisabled}
                    pressed={isActive('bold')}
                    onPress={() => editor?.chain().focus().toggleBold().run()}
                    aria-label="Tebal"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <Bold className="size-4" />
                </Toggle>
                <Toggle
                    disabled={toolbarDisabled}
                    pressed={isActive('italic')}
                    onPress={() => editor?.chain().focus().toggleItalic().run()}
                    aria-label="Miring"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <Italic className="size-4" />
                </Toggle>
                <Toggle
                    disabled={toolbarDisabled}
                    pressed={isActive('underline')}
                    onPress={() => editor?.chain().focus().toggleUnderline().run()}
                    aria-label="Garis bawah"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <UnderlineIcon className="size-4" />
                </Toggle>
                <Toggle
                    disabled={toolbarDisabled}
                    pressed={isActive('strike')}
                    onPress={() => editor?.chain().focus().toggleStrike().run()}
                    aria-label="Coret"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <Strikethrough className="size-4" />
                </Toggle>
                <Separator orientation="vertical" className="h-4" />
                <Toggle
                    disabled={toolbarDisabled}
                    pressed={isActive('heading2')}
                    onPress={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                    aria-label="Judul besar"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <Heading2 className="size-4" />
                </Toggle>
                <Toggle
                    disabled={toolbarDisabled}
                    pressed={isActive('heading3')}
                    onPress={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                    aria-label="Judul kecil"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <Heading3 className="size-4" />
                </Toggle>
                <Separator orientation="vertical" className="h-4" />
                <Toggle
                    disabled={toolbarDisabled}
                    pressed={isActive('bulletList')}
                    onPress={() => editor?.chain().focus().toggleBulletList().run()}
                    aria-label="Daftar bulatan"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <List className="size-4" />
                </Toggle>
                <Toggle
                    disabled={toolbarDisabled}
                    pressed={isActive('orderedList')}
                    onPress={() => editor?.chain().focus().toggleOrderedList().run()}
                    aria-label="Daftar angka"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <ListOrdered className="size-4" />
                </Toggle>
                <Toggle
                    disabled={toolbarDisabled}
                    pressed={isActive('blockquote')}
                    onPress={() => editor?.chain().focus().toggleBlockquote().run()}
                    aria-label="Kutipan"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <Quote className="size-4" />
                </Toggle>
                <Separator orientation="vertical" className="h-4" />
                <Button disabled={toolbarDisabled} onClick={toggleLink} aria-label="Sisipkan tautan" variant="outline" size="sm" className="h-8 w-8">
                    <LinkIcon className="size-4" />
                </Button>
                <Separator orientation="vertical" className="h-4" />
                <Button
                    disabled={toolbarDisabled}
                    onClick={() => editor?.chain().focus().undo().run()}
                    aria-label="Batalkan"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <Undo className="size-4" />
                </Button>
                <Button
                    disabled={toolbarDisabled}
                    onClick={() => editor?.chain().focus().redo().run()}
                    aria-label="Ulangi"
                    variant="outline"
                    size="sm"
                    className="h-8 w-8"
                >
                    <Redo className="size-4" />
                </Button>
            </div>

            {/* Area editor */}
            <div
                className={cn(
                    'min-h-[200px] rounded-md border outline-none focus-within:ring-1',
                    minHeight,
                    error ? 'border-destructive focus-within:ring-destructive' : 'border-input focus-within:ring-ring',
                )}
                style={{ minHeight }}
            >
                <EditorContent editor={editor} className="min-h-full p-2 outline-none" />
                {error && <p className="text-destructive mt-1 text-xs">{error}</p>}
            </div>

            {/* Dialog tautan (overlay sederhana, konsisten shadcn) */}
            {linkOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setLinkOpen(false)}>
                    <div className="bg-background w-full max-w-md rounded-lg border p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
                        <h3 className="mb-3 text-sm font-medium">Suntik tautan</h3>
                        <input
                            type="text"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://example.com atau mailto:contoh@domain.com"
                            className="border-input focus-visible:ring-ring mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-muted-foreground mt-1 text-xs">Hanya protokol http, https, atau mailto yang diizinkan.</p>
                        <div className="mt-4 flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setLinkOpen(false)}>
                                Batal
                            </Button>
                            <Button size="sm" onClick={handleLinkSave} disabled={!isAllowedLink(linkUrl)}>
                                Simpan
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
