import { useState, useMemo } from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, Download } from "lucide-react";
import { DoctorDemandRow } from "@/hooks/useDoctorDemandAnalytics";
import { useAdminAnalyticsExport } from "@/hooks/useAdminAnalyticsExport";

type SortKey = "total_appointments" | "repeat_patient_pct" | "unique_patients" | "appointments_30d";

interface Props {
  data: DoctorDemandRow[];
}

export function DoctorDemandTable({ data }: Props) {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("total_appointments");
  const { exportCSV, exportPDF, isExporting } = useAdminAnalyticsExport();

  const specialties = useMemo(() => {
    const set = new Set(data.map((d) => d.specialty).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.full_name?.toLowerCase().includes(q) ||
          d.specialty?.toLowerCase().includes(q)
      );
    }
    if (specialty !== "all") {
      result = result.filter((d) => d.specialty === specialty);
    }
    return [...result].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0));
  }, [data, search, specialty, sortBy]);

  const handleExport = (type: "csv" | "pdf") => {
    const exportData = {
      title: "Doctor Demand Analytics",
      headers: ["Doctor", "Specialty", "Total Appts", "30d Appts", "Unique Patients", "Repeat Patients", "Repeat %", "Avg Visits"],
      rows: filtered.map((d) => [
        d.full_name || "",
        d.specialty || "",
        String(d.total_appointments),
        String(d.appointments_30d),
        String(d.unique_patients),
        String(d.repeat_patients),
        `${d.repeat_patient_pct}%`,
        String(d.avg_visits_per_patient),
      ]),
    };
    type === "csv" ? exportCSV(exportData) : exportPDF(exportData);
  };

  const toggleSort = (key: SortKey) => setSortBy(key);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search doctors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Specialties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {specialties.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={isExporting}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={isExporting}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("total_appointments")}>
                  Total Appts <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("appointments_30d")}>
                  30d <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("unique_patients")}>
                  Patients <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("repeat_patient_pct")}>
                  Repeat % <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Avg Visits</TableHead>
              <TableHead>Grade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No doctors found
                </TableCell>
              </TableRow>
            ) : (
              filtered.slice(0, 100).map((doc, i) => (
                <TableRow key={doc.doctor_id}>
                  <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                  <TableCell className="font-medium">{doc.full_name || "—"}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{doc.specialty || "—"}</Badge></TableCell>
                  <TableCell className="font-semibold">{doc.total_appointments}</TableCell>
                  <TableCell>{doc.appointments_30d}</TableCell>
                  <TableCell>{doc.unique_patients}</TableCell>
                  <TableCell>
                    <Badge
                      variant={doc.repeat_patient_pct >= 50 ? "default" : doc.repeat_patient_pct >= 25 ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {doc.repeat_patient_pct}%
                    </Badge>
                  </TableCell>
                  <TableCell>{doc.avg_visits_per_patient}</TableCell>
                  <TableCell>
                    {doc.lab_grade ? (
                      <Badge
                        className={`text-xs ${
                          doc.lab_grade === "A" ? "bg-green-500/15 text-green-700 dark:text-green-400" :
                          doc.lab_grade === "B" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                          doc.lab_grade === "C" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                          "bg-red-500/15 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {doc.lab_grade}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">Showing {Math.min(filtered.length, 100)} of {filtered.length} doctors</p>
    </div>
  );
}
