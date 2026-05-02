import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Hospital } from "@/types/hospital";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  Users,
  Building2,
  Bed,
  UserPlus,
  Receipt,
  ClipboardList,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { HospitalDataImportDialog } from "@/components/hospital/HospitalDataImportDialog";
import { ImportType } from "@/hooks/useHospitalDataImport";
import { format } from "date-fns";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

const IMPORT_CARDS = [
  {
    type: 'departments' as ImportType,
    label: 'Departments',
    icon: Building2,
    description: 'Import organizational departments and assign department heads',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    type: 'staff' as ImportType,
    label: 'Staff Roster',
    icon: Users,
    description: 'Bulk import staff members and automatically send invitations',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    type: 'wards' as ImportType,
    label: 'Wards & Beds',
    icon: Bed,
    description: 'Set up wards and bed configurations in bulk',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    type: 'patients' as ImportType,
    label: 'Patient Registry',
    icon: UserPlus,
    description: 'Connect with existing patients using email or GHPID matching',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    type: 'admissions' as ImportType,
    label: 'Admissions',
    icon: ClipboardList,
    description: 'Import historical admission records with diagnosis and bed assignments',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  {
    type: 'invoices' as ImportType,
    label: 'Billing & Invoices',
    icon: Receipt,
    description: 'Import invoice and billing data for patient records',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
];

export default function HospitalDataImportPage() {
  const { hospital } = useOutletContext<HospitalContext>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ImportType | undefined>(undefined);
  
  const { data: importHistory, isLoading } = useQuery({
    queryKey: ['provider-import-logs', hospital.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_import_logs')
        .select('*')
        .eq('provider_id', hospital.id)
        .eq('provider_type', 'hospital')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
  });
  
  const openImportDialog = (type?: ImportType) => {
    setSelectedType(type);
    setDialogOpen(true);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'completed_with_errors':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getTypeLabel = (type: string) => {
    const card = IMPORT_CARDS.find(c => c.type === type);
    return card?.label || type;
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Data Import</h1>
          <p className="text-muted-foreground">
            Bulk import organizational data from CSV files
          </p>
        </div>
        <Button onClick={() => openImportDialog()}>
          <Upload className="h-4 w-4 mr-2" />
          Start Import
        </Button>
      </div>
      
      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {IMPORT_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.type}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              onClick={() => openImportDialog(card.type)}
            >
              <CardHeader className="pb-2">
                <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center mb-2`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <CardTitle className="text-base">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{card.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Import History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import History
          </CardTitle>
          <CardDescription>
            Recent data imports and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
          ) : importHistory && importHistory.length > 0 ? (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Imported</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                    <TableHead className="text-right">Errors</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{getTypeLabel(log.import_type)}</TableCell>
                      <TableCell>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell className="text-right text-green-600">{log.imported_count}</TableCell>
                      <TableCell className="text-right text-yellow-600">{log.skipped_count}</TableCell>
                      <TableCell className="text-right text-red-600">{log.error_count}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No import history yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start by importing departments, staff, or patient data
              </p>
              <Button variant="outline" className="mt-4" onClick={() => openImportDialog()}>
                <Upload className="h-4 w-4 mr-2" />
                Start Your First Import
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <HospitalDataImportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        hospitalId={hospital.id}
        initialType={selectedType}
      />
    </div>
  );
}
