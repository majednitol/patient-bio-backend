import React from "react";

interface HighlightMatchProps {
  text: string;
  query: string;
  className?: string;
}

export function HighlightMatch({ text, query, className }: HighlightMatchProps) {
  if (!query || query.trim().length < 2) {
    return <span className={className}>{text}</span>;
  }

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-primary/20 text-foreground rounded-sm px-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
