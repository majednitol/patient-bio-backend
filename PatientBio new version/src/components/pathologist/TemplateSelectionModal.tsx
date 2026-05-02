import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reportTemplates, ReportTemplate } from "./reportTemplates";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useReportTemplateLibrary, SavedReportTemplate } from "@/hooks/useReportTemplateLibrary";
import { Trash2, Loader2, BookMarked } from "lucide-react";

interface TemplateSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: ReportTemplate) => void;
}

const categoryColors: Record<string, string> = {
  general: "bg-secondary text-secondary-foreground",
  diabetes: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  heart_disease: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  covid19: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  cancer: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

function savedToReportTemplate(saved: SavedReportTemplate): ReportTemplate {
  return {
    id: saved.id,
    name: saved.name,
    type: saved.template_structure.report_type || "",
    category: saved.template_structure.disease_category || "",
    icon: saved.template_structure.icon || "📋",
    description: `Custom template · ${saved.test_type || "General"}`,
    findings: saved.template_structure.findings_template || "",
  };
}

export const TemplateSelectionModal = ({
  open,
  onOpenChange,
  onSelectTemplate,
}: TemplateSelectionModalProps) => {
  const { savedTemplates, isLoading, deleteTemplate } = useReportTemplateLibrary();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Select Report Template</DialogTitle>
          <DialogDescription>
            Choose a template to pre-fill common test structures, or start blank
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {/* Saved Templates Section */}
          {savedTemplates.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <BookMarked className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-primary">My Templates</h3>
                <Badge variant="secondary" className="text-[10px]">{savedTemplates.length}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {savedTemplates.map((saved) => {
                  const template = savedToReportTemplate(saved);
                  return (
                    <Card
                      key={saved.id}
                      className="cursor-pointer transition-all hover:border-primary hover:shadow-md group relative"
                      onClick={() => onSelectTemplate(template)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{template.icon}</span>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                              {template.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                            <Badge variant="outline" className="mt-2 text-xs border-primary/30 text-primary">
                              Custom
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTemplate.mutate(saved.id);
                            }}
                            disabled={deleteTemplate.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="border-b mb-3" />
              <p className="text-xs text-muted-foreground mb-2">Built-in Templates</p>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Built-in Templates */}
          <div className="grid grid-cols-2 gap-3">
            {reportTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md group"
                onClick={() => onSelectTemplate(template)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
                        {template.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      {template.category && (
                        <Badge
                          variant="outline"
                          className={`mt-2 text-xs capitalize ${
                            categoryColors[template.category] || ""
                          }`}
                        >
                          {template.category.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
