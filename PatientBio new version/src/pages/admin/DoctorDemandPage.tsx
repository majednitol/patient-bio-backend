import { useDoctorDemandAnalytics } from "@/hooks/useDoctorDemandAnalytics";
import { DoctorDemandTable } from "@/components/admin/DoctorDemandTable";
import { SpecialtyDemandChart } from "@/components/admin/SpecialtyDemandChart";
import { PatientLoyaltyCard } from "@/components/admin/PatientLoyaltyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, BarChart3 } from "lucide-react";

export default function DoctorDemandPage() {
  const { data, isLoading } = useDoctorDemandAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const doctors = data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2.5 rounded-xl">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Doctor Demand & Patient Loyalty</h1>
          <p className="text-sm text-muted-foreground">
            Analyze high-demand doctors and repeat patient patterns across the platform
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rankings">Doctor Rankings</TabsTrigger>
          <TabsTrigger value="specialties">Specialty Demand</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <PatientLoyaltyCard data={doctors} />
          <SpecialtyDemandChart data={doctors} />
        </TabsContent>

        <TabsContent value="rankings" className="mt-4">
          <DoctorDemandTable data={doctors} />
        </TabsContent>

        <TabsContent value="specialties" className="mt-4">
          <SpecialtyDemandChart data={doctors} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
