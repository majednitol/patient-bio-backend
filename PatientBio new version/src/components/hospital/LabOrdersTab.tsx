import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InlineEmptyState } from "@/components/ui/empty-state";
import { FlaskConical, Plus } from "lucide-react";
import { useAdmissionLabOrders, useHospitalLabOrders } from "@/hooks/useHospitalLabOrders";
import LabOrderCard from "./LabOrderCard";
import OrderLabTestDialog from "./OrderLabTestDialog";
import { ViewLabResultsDialog } from "./ViewLabResultsDialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";

interface LabOrdersTabProps {
  hospitalId: string;
  admissionId: string;
  patientId: string;
  patientName: string;
  wardBedInfo?: string;
  canOrder?: boolean;
}

export default function LabOrdersTab({
  hospitalId,
  admissionId,
  patientId,
  patientName,
  wardBedInfo,
  canOrder = true,
}: LabOrdersTabProps) {
  const { orders, isLoading } = useAdmissionLabOrders(admissionId);
  const { updateOrderStatus, cancelOrder } = useHospitalLabOrders(hospitalId);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [viewResultsOrderId, setViewResultsOrderId] = useState<string | null>(null);

  const handleCollectSample = (orderId: string) => {
    updateOrderStatus.mutate({ orderId, status: "sample_collected" });
  };

  const handleCancel = (orderId: string) => {
    cancelOrder.mutate(orderId);
  };

  const handleViewResults = (orderId: string) => {
    setViewResultsOrderId(orderId);
  };

  if (isLoading) {
    return <PageSkeleton type="list" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Lab/Radiology Orders</h3>
        {canOrder && (
          <Button size="sm" onClick={() => setOrderDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Order Test
          </Button>
        )}
      </div>

      {orders.length === 0 ? (
        <InlineEmptyState
          icon={FlaskConical}
          title="No lab orders"
          description="Order lab or radiology tests for this patient"
          action={canOrder ? {
            label: "Order Test",
            onClick: () => setOrderDialogOpen(true),
            icon: Plus,
          } : undefined}
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <LabOrderCard
              key={order.id}
              order={order}
              showPatientInfo={false}
              onCollectSample={handleCollectSample}
              onCancel={handleCancel}
              onViewResults={handleViewResults}
              isUpdating={updateOrderStatus.isPending || cancelOrder.isPending}
            />
          ))}
        </div>
      )}

      <OrderLabTestDialog
        open={orderDialogOpen}
        onOpenChange={setOrderDialogOpen}
        hospitalId={hospitalId}
        patientId={patientId}
        patientName={patientName}
        admissionId={admissionId}
        wardBedInfo={wardBedInfo}
      />

      <ViewLabResultsDialog
        orderId={viewResultsOrderId}
        open={!!viewResultsOrderId}
        onOpenChange={(open) => !open && setViewResultsOrderId(null)}
      />
    </div>
  );
}
