import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  usePrescriptionTemplates,
  useDeletePrescriptionTemplate,
  PrescriptionTemplate,
} from "@/hooks/usePrescriptionTemplates";
import { FileText, Search, Trash2, Pill, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrescriptionTemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: PrescriptionTemplate) => void;
}

export const PrescriptionTemplateSelector = ({
  open,
  onOpenChange,
  onSelectTemplate,
}: PrescriptionTemplateSelectorProps) => {
  const { data: templates = [], isLoading } = usePrescriptionTemplates();
  const deleteTemplate = useDeletePrescriptionTemplate();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.diagnosis?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = () => {
    const template = templates.find((t) => t.id === selectedId);
    if (template) {
      onSelectTemplate(template);
      onOpenChange(false);
      setSelectedId(null);
      setSearch("");
    }
  };

  const handleDelete = (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (confirm("Delete this template?")) {
      deleteTemplate.mutate(templateId);
      if (selectedId === templateId) setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Prescription Templates
          </DialogTitle>
          <DialogDescription>
            Select a saved template to quickly fill in medications
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={templates.length === 0 ? "No templates yet" : "No matches"}
            description={
              templates.length === 0
                ? "Save your first template when creating a prescription"
                : "Try a different search term"
            }
          />
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedId(template.id)}
                  className={cn(
                    "p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50",
                    selectedId === template.id && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{template.name}</p>
                        {selectedId === template.id && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </div>
                      {template.diagnosis && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {template.diagnosis}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <Pill className="h-3 w-3 text-muted-foreground" />
                        {template.medications.slice(0, 3).map((med, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {med.name}
                          </Badge>
                        ))}
                        {template.medications.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.medications.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => handleDelete(e, template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedId}>
            Use Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
