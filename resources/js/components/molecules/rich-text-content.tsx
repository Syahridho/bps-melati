'use client';

import React from 'react';
import { type ReactNode } from 'react';

interface RichTextContentProps {
  html: string | null | undefined;
  className?: string;
}

/**
 * Render konten HTML yang SUDAH disanitasi di sisi server.
 *
 * Hanya gunakan untuk konten yang telah melalui sanitasi server-side
 * (whitelist tag: p, br, strong, em, u, s, h2, h3, ul, ol, li, blockquote, a[href], code).
 * Data lama (plain text tanpa tag) tetap ditampilkan rapi dengan penanganan baris baru.
 */
export function RichTextContent({ html, className }: RichTextContentProps): ReactNode {
  if (!html) {
    return null;
  }

  const trimmed = html.trim();

  // Jika tidak ada tag HTML sama sekali (plain text lama), render sebagai teks
  // dengan penanganan baris baru agar tetap rapi.
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) {
    return (
      <div className={cn('whitespace-pre-wrap break-words [overflow-wrap:anywhere]', className)}>
        {trimmed.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < trimmed.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn('prose prose-sm max-w-none break-words [overflow-wrap:anywhere]', className)}
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}

function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs.filter(Boolean).join(' ');
}