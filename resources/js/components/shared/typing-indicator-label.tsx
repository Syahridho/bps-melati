import React from 'react';

interface TypingIndicatorLabelProps {
  names: string[];
}

export function TypingIndicatorLabel({ names }: TypingIndicatorLabelProps) {
  if (!names || names.length === 0) return null;

  // Sort by name for consistent ordering, but maintain stable order based on when they started
  const sorted = [...names].sort();

  return (
    <div className="flex flex-col gap-1 pt-2 min-h-[36px]">
      {sorted.map((name, index) => (
        <span
          key={index}
          className="text-xs text-primary flex items-center gap-1.5"
          aria-live="polite"
        >
          <span className="animate-pulse inline-block size-1.5 rounded-full mr-1" aria-hidden="true" />
          {name} sedang mengetik balasan...
        </span>
      ))}
    </div>
  );
}