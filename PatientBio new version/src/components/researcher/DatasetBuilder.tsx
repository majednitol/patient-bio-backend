import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Save, FolderOpen, Trash2, FileJson, FileSpreadsheet, Heart, Loader2, ChevronDown, Copy } from "lucide-react";
import { useSavedDatasets } from "@/hooks/useSavedDatasets";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PoolEntry {
  id: string;
  contribution_hash: string;
  anonymized_data: Record<string, unknown>;
  data_categories: string[];
  disease_categories: string[];
  age_range: string | null;
  gender: string | null;
  source_jurisdiction: string;
  govt_approval_status: string;
  contributed_at: string;
}

interface DatasetBuilderProps {
  poolData: PoolEntry[];
  filters: Record<string, string | undefined>;
  onLoadFilters: (filters: Record<string, string | undefined>) => void;
}

// --- Export utilities ---

const exportAsCSV = (data: PoolEntry[]) => {
  const headers = ["id", "disease_categories", "data_categories", "age_range", "gender", "source_jurisdiction", "contributed_at"];
  const rows = data.map(d => [
    d.id,
    d.disease_categories.join("; "),
    d.data_categories.join("; "),
    d.age_range || "",
    d.gender || "",
    d.source_jurisdiction,
    d.contributed_at,
  ]);
  const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
  downloadFile(csv, "global-pool-export.csv", "text/csv");
};

const exportAsJSON = (data: PoolEntry[]) => {
  const sanitized = data.map(({ id, anonymized_data, data_categories, disease_categories, age_range, gender, source_jurisdiction, contributed_at }) => ({
    id, anonymized_data, data_categories, disease_categories, age_range, gender, source_jurisdiction, contributed_at,
  }));
  downloadFile(JSON.stringify(sanitized, null, 2), "global-pool-export.json", "application/json");
};

const exportAsFHIR = (data: PoolEntry[]) => {
  const bundle = {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    total: data.length,
    entry: data.map(d => ({
      fullUrl: `urn:uuid:${d.id}`,
      resource: {
        resourceType: "Observation",
        id: d.id,
        status: "final",
        code: {
          coding: d.disease_categories.map(dc => ({
            system: "http://snomed.info/sct",
            display: dc,
          })),
        },
        subject: {
          display: `Anonymous (${d.age_range || "unknown"}, ${d.gender || "unknown"})`,
        },
        effectiveDateTime: d.contributed_at,
        component: d.data_categories.map(cat => ({
          code: { text: cat },
          valueString: JSON.stringify((d.anonymized_data as Record<string, unknown>)?.[cat] || {}),
        })),
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/patient-jurisdiction",
            valueCode: d.source_jurisdiction,
          },
        ],
      },
    })),
  };
  downloadFile(JSON.stringify(bundle, null, 2), "global-pool-fhir-bundle.json", "application/fhir+json");
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const generateCitation = (recordCount: number, filters: Record<string, string | undefined>) => {
  const filterDesc = Object.entries(filters)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");
  const date = format(new Date(), "yyyy-MM-dd");
  return `Anonymous Health Data Pool [Dataset]. ${recordCount} records${filterDesc ? ` (filtered: ${filterDesc})` : ""}. Retrieved ${date} from PatientBio Global Research Platform.`;
};

export const DatasetBuilder = ({ poolData, filters, onLoadFilters }: DatasetBuilderProps) => {
  const { datasets, isLoading: datasetsLoading, saveDataset, deleteDataset } = useSavedDatasets();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [datasetName, setDatasetName] = useState("");
  const [datasetDesc, setDatasetDesc] = useState("");

  const handleSave = () => {
    if (!datasetName.trim()) return;
    saveDataset.mutate(
      { name: datasetName.trim(), description: datasetDesc.trim(), filterConfig: filters, recordCount: poolData.length },
      { onSuccess: () => { setSaveDialogOpen(false); setDatasetName(""); setDatasetDesc(""); } }
    );
  };

  const handleCopyCitation = () => {
    const citation = generateCitation(poolData.length, filters);
    navigator.clipboard.writeText(citation);
    toast({ title: "Citation copied", description: "Research citation copied to clipboard." });
  };

  const hasFilters = Object.values(filters).some(v => v);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Export & Dataset Builder</CardTitle>
            <CardDescription>{poolData.length} records matching current filters</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={poolData.length === 0}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export
                  <ChevronDown className="h-3.5 w-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportAsCSV(poolData)}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAsJSON(poolData)}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export as JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAsFHIR(poolData)}>
                  <Heart className="h-4 w-4 mr-2" />
                  Export as FHIR R4 Bundle
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Copy Citation */}
            <Button variant="outline" size="sm" onClick={handleCopyCitation} disabled={poolData.length === 0}>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Citation
            </Button>

            {/* Save Dataset */}
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!hasFilters}>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Dataset
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Dataset Preset</DialogTitle>
                  <DialogDescription>Save your current filter combination for quick access later.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label>Dataset Name</Label>
                    <Input placeholder="e.g., Diabetic Males 40-60" value={datasetName} onChange={e => setDatasetName(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description (optional)</Label>
                    <Input placeholder="Brief description of this dataset" value={datasetDesc} onChange={e => setDatasetDesc(e.target.value)} />
                  </div>
                  <div className="p-2 rounded-md bg-muted/50 border">
                    <p className="text-xs font-medium mb-1">Active Filters:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-xs">{k}: {v}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{poolData.length} records match</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={!datasetName.trim() || saveDataset.isPending}>
                    {saveDataset.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      {/* Saved Datasets */}
      {datasets.length > 0 && (
        <CardContent className="pt-0">
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <FolderOpen className="h-3.5 w-3.5" />
              Saved Datasets ({datasets.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {datasets.map(ds => (
                <div
                  key={ds.id}
                  className="p-2.5 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors group"
                  onClick={() => onLoadFilters(ds.filter_config)}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{ds.name}</p>
                      {ds.description && (
                        <p className="text-xs text-muted-foreground truncate">{ds.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {ds.record_count} records • {format(new Date(ds.updated_at), "PP")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={e => { e.stopPropagation(); deleteDataset.mutate(ds.id); }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};
