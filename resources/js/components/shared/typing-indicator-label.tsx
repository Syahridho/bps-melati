import React from 'react';

interface TypingIndicatorLabelProps {
  typingUsers: { id: number; name: string }[];
}

export function TypingIndicatorLabel({ typingUsers }: TypingIndicatorLabelProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const sorted = [...typingUsers].sort((a, b) => a.name.localeCompare(b.name));
  const first = sorted[0];
  const others = sorted.slice(1);

  let label: string;
  if (sorted.length === 1) {
    label = `${first.name} sedang mengetik balasan...`;
  } else if (sorted.length === 2) {
    label = `${first.name} dan ${others[0].name} sedang mengetik balasan...`;
  } else {
    const othersCount = sorted.length - 1;
    label = `${first.name} dan ${othersCount} lainnya sedang mengetik balasan...`;
  }

  return (
    <span className="text-xs text-primary flex items-start gap-1.5" aria-live="polite">
      <span className="animate-pulse inline-block size-1.5 rounded-full mr-1" aria-hidden="true" />
      <span className="animate-pulse inline-block size-1.5 rounded-full mr-1" aria-hidden="true" />
      <span className="animate-pulse inline-block size-1.5 rounded-full mr-1" aria-hidden="true" />
      {label}
    </span>
  );
}