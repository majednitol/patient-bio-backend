import { useState, useMemo } from "react";
import { LabOperationsSummaryStrip } from "@/components/pathologist/LabOperationsSummaryStrip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Receipt,
  CreditCard,
  Printer,
  XCircle,
  FileText,
  Banknote,
  Clock,
  CheckCircle,
  Microscope,
  Heart,
  AlertTriangle,
  Bell,
  ArrowRight,
} from "lucide-react";
import {
  usePathologistInvoices,
  usePathologistInvoice,
  usePathologistInvoiceMutations,
  Invoice,
  InvoiceStatus,
} from "@/hooks/usePathologistInvoices";
import { InvoiceDialog } from "@/components/pathologist/InvoiceDialog";
import { PaymentDialog } from "@/components/pathologist/PaymentDialog";
import { InvoicePrintView } from "@/components/pathologist/InvoicePrintView";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
 
 const statusColors: Record<InvoiceStatus, string> = {
   draft: "bg-muted/80 text-muted-foreground",
   pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
   partial: "bg-[hsl(var(--diagnostic-secondary)/0.15)] text-[hsl(var(--diagnostic-secondary))]",
   paid: "bg-[hsl(var(--diagnostic-accent)/0.15)] text-[hsl(var(--diagnostic-accent))]",
   cancelled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200",
 };
 
 const PathologistBillingPage = () => {
    const { user } = useAuth();
    const { data: invoices, isLoading } = usePathologistInvoices();
    const { cancelInvoice } = usePathologistInvoiceMutations();
    
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [dateRange, setDateRange] = useState<string>("all");
    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

    // Fetch recent payments
    const { data: recentPayments } = useQuery({
      queryKey: ["pathologist-recent-payments", user?.id],
      queryFn: async () => {
        if (!user?.id) return [];
        const { data, error } = await supabase
          .from("pathologist_payments")
          .select("*, invoice:pathologist_invoices(invoice_number, patient_id)")
          .eq("pathologist_id", user.id)
          .order("payment_date", { ascending: false })
          .limit(5);
        if (error) throw error;
        return data || [];
      },
      enabled: !!user?.id,
    });
    
   const { data: invoiceWithItems } = usePathologistInvoice(printInvoice?.id || null);

   // Fetch patient names for invoices
   const patientIds = useMemo(() => {
     if (!invoices?.length) return [];
     return [...new Set(invoices.map((i) => i.patient_id))];
   }, [invoices]);

   const { data: patientProfiles, isLoading: isLoadingPatients } = useQuery({
     queryKey: ["patient-names-for-invoices", patientIds],
     queryFn: async () => {
       if (!patientIds.length) return [];
       const { data } = await supabase
         .from("user_profiles")
         .select("user_id, display_name")
         .in("user_id", patientIds);
       return data || [];
     },
     enabled: patientIds.length > 0,
   });

   const patientNameMap = useMemo(() => {
     const map: Record<string, string> = {};
     patientProfiles?.forEach((p) => {
       map[p.user_id] = p.display_name;
     });
     return map;
   }, [patientProfiles]);

   // Date range filtering
    const getDateRangeStart = (): Date | null => {
      const now = new Date();
      switch (dateRange) {
        case "week": {
          const d = new Date(now);
          d.setDate(d.getDate() - 7);
          return d;
        }
        case "month": {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 1);
          return d;
        }
        case "3months": {
          const d = new Date(now);
          d.setMonth(d.getMonth() - 3);
          return d;
        }
        default: return null;
      }
    };

   // Overdue detection (pending invoices > 30 days old)
   const isOverdue = (invoice: Invoice): boolean => {
     if (invoice.status !== "pending" && invoice.status !== "partial") return false;
     const invoiceDate = new Date(invoice.invoice_date);
     const daysSince = (Date.now() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24);
     return daysSince > 30;
   };

   const filteredInvoices = invoices?.filter((invoice) => {
      const matchesSearch =
        invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        invoice.patient_id.toLowerCase().includes(search.toLowerCase()) ||
        (patientNameMap[invoice.patient_id] || "").toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
      const dateStart = getDateRangeStart();
      const matchesDate = !dateStart || new Date(invoice.invoice_date) >= dateStart;
      return matchesSearch && matchesStatus && matchesDate;
    }) || [];
 
   const overdueInvoices = useMemo(() => 
     invoices?.filter(i => isOverdue(i)) || [], [invoices]);

   const overdueTotal = useMemo(() => 
     overdueInvoices.reduce((sum, i) => sum + (i.total_amount - i.amount_paid), 0), [overdueInvoices]);

   const stats = {
     total: invoices?.length || 0,
     pendingAmount: invoices
       ?.filter((i) => i.status === "pending" || i.status === "partial")
       .reduce((sum, i) => sum + (i.total_amount - i.amount_paid), 0) || 0,
     collectedAmount: invoices?.reduce((sum, i) => sum + i.amount_paid, 0) || 0,
   };
 
   const handleRecordPayment = (invoice: Invoice) => {
     setSelectedInvoice(invoice);
     setPaymentDialogOpen(true);
   };
 
   const handlePrint = (invoice: Invoice) => {
     setPrintInvoice(invoice);
   };
 
   const handleCancel = async (invoiceId: string) => {
     await cancelInvoice.mutateAsync(invoiceId);
   };
 
   if (isLoading) {
     return (
       <div className="container mx-auto p-6 space-y-6 flex flex-col items-center justify-center py-12">
         <div className="p-4 rounded-2xl diagnostic-gradient">
           <Microscope className="h-8 w-8 text-white animate-pulse" />
         </div>
         <Skeleton className="h-8 w-48" />
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <Skeleton className="h-32" />
           <Skeleton className="h-32" />
           <Skeleton className="h-32" />
         </div>
       </div>
     );
   }
 
    return (
      <div className="container mx-auto p-6 space-y-6">
        <LabOperationsSummaryStrip />
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-4">
           <div className="p-3 rounded-2xl diagnostic-gradient">
             <Receipt className="h-6 w-6 text-white" />
           </div>
           <div>
             <h1 className="text-3xl font-bold">Billing & Invoices</h1>
             <p className="text-muted-foreground flex items-center gap-1">
               <Heart className="h-4 w-4" />
               Keep your finances organized
             </p>
           </div>
         </div>
         <Button onClick={() => setInvoiceDialogOpen(true)} className="diagnostic-gradient text-white hover:opacity-90">
           <Plus className="h-4 w-4 mr-2" /> Create Invoice
         </Button>
       </div>
 
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="diagnostic-stat-card">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
             <FileText className="h-4 w-4 text-[hsl(var(--diagnostic-primary))]" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-foreground">{stats.total}</div>
             <p className="text-xs text-muted-foreground mt-1">Invoices created</p>
           </CardContent>
         </Card>
 
         <Card className="diagnostic-stat-card">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
             <Clock className="h-4 w-4 text-amber-500" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-amber-600">
                ৳{stats.pendingAmount.toFixed(2)}
             </div>
             <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
           </CardContent>
         </Card>
 
         <Card className="diagnostic-stat-card">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
             <CardTitle className="text-sm font-medium">Collected</CardTitle>
             <CheckCircle className="h-4 w-4 text-[hsl(var(--diagnostic-accent))]" />
           </CardHeader>
           <CardContent>
             <div className="text-2xl font-bold text-[hsl(var(--diagnostic-accent))]">
                ৳{stats.collectedAmount.toFixed(2)}
             </div>
             <p className="text-xs text-muted-foreground mt-1">Successfully received</p>
           </CardContent>
         </Card>
       </div>

       {/* Overdue Alert Banner */}
       {overdueInvoices.length > 0 && (
         <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
           <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
           <div className="flex-1">
             <p className="text-sm font-medium text-destructive">
               {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? "s" : ""} — ৳{overdueTotal.toFixed(2)} outstanding
             </p>
             <p className="text-xs text-muted-foreground">
               These invoices are 30+ days past due
             </p>
           </div>
           <Button
             variant="outline"
             size="sm"
             className="text-destructive border-destructive/30"
             onClick={() => setStatusFilter("pending")}
           >
             View Overdue
           </Button>
         </div>
       )}

       {/* Recent Payments */}
       {recentPayments && recentPayments.length > 0 && (
         <Card>
           <CardHeader className="pb-3">
             <CardTitle className="text-sm font-medium flex items-center gap-2">
               <Banknote className="h-4 w-4 text-primary" />
               Recent Payments
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="space-y-3">
               {recentPayments.map((payment: any) => (
                 <div key={payment.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                   <div>
                     <p className="font-medium">৳{payment.amount.toFixed(2)}</p>
                     <p className="text-xs text-muted-foreground">
                       {payment.invoice?.invoice_number || "—"} · {payment.payment_method || "Cash"}
                     </p>
                   </div>
                   <span className="text-xs text-muted-foreground">
                     {format(new Date(payment.payment_date), "MMM d, yyyy")}
                   </span>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>
       )}

       <Card className="diagnostic-card">
         <CardHeader>
           <div className="flex items-center justify-between">
             <div className="relative w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               <Input
                 placeholder="Search invoices..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="pl-9 focus-visible:ring-[hsl(var(--diagnostic-primary))]"
               />
             </div>
           </div>
         </CardHeader>
         <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="partial">Partial</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Period:</span>
                {(["all", "week", "month", "3months"] as const).map((r) => (
                  <Button
                    key={r}
                    variant={dateRange === r ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setDateRange(r)}
                  >
                    {r === "all" ? "All" : r === "week" ? "7d" : r === "month" ? "30d" : "90d"}
                  </Button>
                ))}
              </div>
            </div>
  
              <div className="mt-4">
               {filteredInvoices.length === 0 ? (
                 <div className="text-center py-12 text-muted-foreground">
                   <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--diagnostic-primary)/0.1)] flex items-center justify-center">
                     <Receipt className="h-8 w-8 text-[hsl(var(--diagnostic-primary))]" />
                   </div>
                   <p className="font-medium">No invoices found</p>
                   <p className="text-sm mt-1">Create your first invoice to get started</p>
                 </div>
               ) : (
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Invoice #</TableHead>
                       <TableHead>Date</TableHead>
                       <TableHead>Patient</TableHead>
                       <TableHead className="text-right">Amount</TableHead>
                       <TableHead className="text-right">Paid</TableHead>
                       <TableHead>Status</TableHead>
                       <TableHead className="w-10"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredInvoices.map((invoice) => (
                       <TableRow key={invoice.id} className="hover:bg-[hsl(var(--diagnostic-primary)/0.02)]">
                         <TableCell className="font-medium">
                           {invoice.invoice_number}
                         </TableCell>
                         <TableCell>
                           {new Date(invoice.invoice_date).toLocaleDateString()}
                         </TableCell>
                         <TableCell className="text-sm">
                           {isLoadingPatients && !patientNameMap[invoice.patient_id]
                             ? <span className="text-muted-foreground italic">Loading...</span>
                             : patientNameMap[invoice.patient_id] || `${invoice.patient_id.slice(0, 8)}...`}
                         </TableCell>
                          <TableCell className="text-right">
                             ৳{invoice.total_amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                             ৳{invoice.amount_paid.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Badge className={statusColors[invoice.status]}>
                                {invoice.status}
                              </Badge>
                              {isOverdue(invoice) && (
                                <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                                  30+ days
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                         <TableCell>
                           <DropdownMenu>
                             <DropdownMenuTrigger asChild>
                               <Button variant="ghost" size="icon">
                                 <MoreVertical className="h-4 w-4" />
                               </Button>
                             </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                               <DropdownMenuItem onClick={() => handlePrint(invoice)}>
                                 <Printer className="h-4 w-4 mr-2" /> Print
                               </DropdownMenuItem>
                               {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                                 <DropdownMenuItem onClick={() => handleRecordPayment(invoice)}>
                                   <CreditCard className="h-4 w-4 mr-2" /> Record Payment
                                 </DropdownMenuItem>
                               )}
                                {isOverdue(invoice) && (
                                  <DropdownMenuItem onClick={async () => {
                                    try {
                                      await supabase.from("notifications").insert({
                                        user_id: invoice.patient_id,
                                        type: "payment_reminder",
                                        title: "Payment Reminder",
                                        message: `Your invoice ${invoice.invoice_number} has an outstanding balance of ৳${(invoice.total_amount - invoice.amount_paid).toFixed(2)}. Please arrange payment at your earliest convenience.`,
                                      });
                                      toast({ title: "Reminder sent", description: `Payment reminder notification sent for ${invoice.invoice_number}` });
                                    } catch {
                                      toast({ title: "Failed to send reminder", variant: "destructive" });
                                    }
                                  }}>
                                    <Bell className="h-4 w-4 mr-2" /> Send Reminder
                                  </DropdownMenuItem>
                                )}
                               {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                                 <DropdownMenuItem
                                   onClick={() => handleCancel(invoice.id)}
                                   className="text-destructive"
                                 >
                                   <XCircle className="h-4 w-4 mr-2" /> Cancel
                                 </DropdownMenuItem>
                               )}
                             </DropdownMenuContent>
                           </DropdownMenu>
                         </TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               )}
              </div>
         </CardContent>
       </Card>
 
       <InvoiceDialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen} />
       
       <PaymentDialog
         open={paymentDialogOpen}
         onOpenChange={setPaymentDialogOpen}
         invoice={selectedInvoice}
       />
 
       {printInvoice && invoiceWithItems && (
         <InvoicePrintView
           invoice={invoiceWithItems}
           onClose={() => setPrintInvoice(null)}
         />
       )}
     </div>
   );
 };
 
 export default PathologistBillingPage;