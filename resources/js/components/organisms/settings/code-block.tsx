import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useRef, useState } from 'react';

interface CodeBlockProps {
    code: string;
    label?: string;
    language?: string;
}

export function CodeBlock({ code, label, language = 'text' }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);
    const codeRef = useRef<HTMLPreElement>(null);

    const handleCopy = useCallback(() => {
        if (!codeRef.current) return;
        const text = codeRef.current.textContent ?? '';
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            toast.success('Tersalin ke clipboard');
            setTimeout(() => setCopied(false), 1500);
        });
    }, []);

    return (
        <div className="w-full overflow-hidden rounded-md border border-input bg-muted dark:bg-muted/80">
            <div className="flex items-center justify-between border-b border-input px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">{label ?? language}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    disabled={copied}
                    className="h-6 w-6"
                >
                    {copied ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                        <Copy className="h-4 w-4" />
                    )}
                </Button>
            </div>
            <ScrollArea className="w-full h-48">
                <pre className="m-0 text-sm font-mono text-foreground leading-relaxed overflow-auto p-4">
                    <code ref={codeRef}>{code}</code>
                </pre>
            </ScrollArea>
        </div>
    );
}
