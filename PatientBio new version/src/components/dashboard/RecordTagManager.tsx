import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag, Plus, X } from "lucide-react";
import { type RecordTag, SUGGESTED_TAGS } from "@/hooks/useRecordTags";

interface RecordTagManagerProps {
  recordId: string;
  tags: RecordTag[];
  allTagNames: string[];
  onAddTag: (params: { recordId: string; tagName: string }) => void;
  onRemoveTag: (tagId: string) => void;
  isAdding?: boolean;
}

export function RecordTagManager({ recordId, tags, allTagNames, onAddTag, onRemoveTag, isAdding }: RecordTagManagerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const existingNames = new Set(tags.map((t) => t.tag_name));
  const suggestions = Array.from(new Set([...allTagNames, ...SUGGESTED_TAGS])).filter((name) => !existingNames.has(name));
  const filteredSuggestions = inputValue.trim() ? suggestions.filter((s) => s.toLowerCase().includes(inputValue.toLowerCase())) : suggestions;

  const handleAdd = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || existingNames.has(trimmed)) return;
    onAddTag({ recordId, tagName: trimmed });
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); handleAdd(inputValue); }
  };

  return (
    <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {tags.map((tag) => (
        <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 cursor-default">
          {tag.tag_name}
          <button className="ml-0.5 hover:text-destructive transition-colors" onClick={(e) => { e.stopPropagation(); onRemoveTag(tag.id); }}>
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-muted-foreground hover:text-primary"><Plus className="h-3 w-3" /></Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-2">
            <Input ref={inputRef} placeholder={t("records.addTag")} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleKeyDown} className="h-7 text-xs" autoFocus />
            {filteredSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                {filteredSuggestions.slice(0, 8).map((name) => (
                  <Badge key={name} variant="outline" className="text-[10px] px-2 py-0.5 cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => handleAdd(name)}>
                    <Tag className="h-2.5 w-2.5 mr-0.5" />{name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}