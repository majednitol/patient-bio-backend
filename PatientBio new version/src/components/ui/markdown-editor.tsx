import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from "react-markdown";
import {
  Bold, Italic, Heading2, List, ListOrdered, Code, Quote,
  Table, Minus, Eye, Pencil, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
  id?: string;
}

type ToolbarAction = {
  icon: React.ElementType;
  label: string;
  prefix: string;
  suffix: string;
  block?: boolean;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { icon: Bold, label: "Bold", prefix: "**", suffix: "**" },
  { icon: Italic, label: "Italic", prefix: "_", suffix: "_" },
  { icon: Heading2, label: "Heading", prefix: "## ", suffix: "", block: true },
  { icon: List, label: "Bullet List", prefix: "- ", suffix: "", block: true },
  { icon: ListOrdered, label: "Numbered List", prefix: "1. ", suffix: "", block: true },
  { icon: Code, label: "Code", prefix: "`", suffix: "`" },
  { icon: Quote, label: "Quote", prefix: "> ", suffix: "", block: true },
  { icon: Link2, label: "Link", prefix: "[", suffix: "](url)" },
  { icon: Minus, label: "Divider", prefix: "\n---\n", suffix: "", block: true },
  { icon: Table, label: "Table", prefix: "\n| Column 1 | Column 2 |\n|----------|----------|\n| ", suffix: " | data |\n", block: true },
];

export const MarkdownEditor = ({
  value,
  onChange,
  placeholder = "Write using Markdown...",
  minRows = 6,
  className,
  id,
}: MarkdownEditorProps) => {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyAction = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end);
      const before = value.slice(0, start);
      const after = value.slice(end);

      let newText: string;
      let cursorPos: number;

      if (action.block && !selected) {
        // For block actions with no selection, add prefix on new line if needed
        const needsNewline = before.length > 0 && !before.endsWith("\n");
        const prefix = (needsNewline ? "\n" : "") + action.prefix;
        newText = before + prefix + action.suffix + after;
        cursorPos = before.length + prefix.length;
      } else {
        newText = before + action.prefix + (selected || action.label) + action.suffix + after;
        cursorPos = before.length + action.prefix.length + (selected || action.label).length;
      }

      onChange(newText);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [value, onChange]
  );

  return (
    <div className={cn("border rounded-md border-input overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-border bg-muted/30 flex-wrap">
        {TOOLBAR_ACTIONS.map((action) => (
          <Button
            key={action.label}
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              if (mode === "preview") setMode("write");
              applyAction(action);
            }}
            title={action.label}
          >
            <action.icon className="h-3.5 w-3.5" />
          </Button>
        ))}

        <div className="flex-1" />

        <div className="flex border rounded-md border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs transition-colors",
              mode === "write"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Pencil className="h-3 w-3" /> Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs transition-colors",
              mode === "preview"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Eye className="h-3 w-3" /> Preview
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      {mode === "write" ? (
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={minRows}
          className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-y font-mono text-sm"
        />
      ) : (
        <div
          className="prose prose-sm dark:prose-invert max-w-none p-3 min-h-[calc(1.5rem*var(--rows)+1.5rem)] overflow-y-auto"
          style={{ "--rows": minRows } as React.CSSProperties}
        >
          {value ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Nothing to preview</p>
          )}
        </div>
      )}
    </div>
  );
};
