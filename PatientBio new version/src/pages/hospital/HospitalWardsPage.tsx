import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Hospital } from "@/types/hospital";
import { useWards, useBeds, useWardMutations, useBedMutations, Ward, Bed, WARD_TYPES, BED_STATUSES } from "@/hooks/useWards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Bed as BedIcon, Building2, Trash2, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface HospitalContext {
  hospital: Hospital;
  isAdmin: boolean;
}

export default function HospitalWardsPage() {
  const { hospital, isAdmin } = useOutletContext<HospitalContext>();
  const { data: wards, isLoading: wardsLoading } = useWards(hospital.id);
  const { data: beds, isLoading: bedsLoading } = useBeds(hospital.id);
  const { createWard, deleteWard } = useWardMutations(hospital.id);
  const { createBed, updateBed, deleteBed } = useBedMutations(hospital.id);

  const [addWardOpen, setAddWardOpen] = useState(false);
  const [addBedOpen, setAddBedOpen] = useState(false);
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const [expandedWards, setExpandedWards] = useState<Set<string>>(new Set());

  const [newWard, setNewWard] = useState({
    name: "",
    type: "general" as Ward["type"],
    floor: "",
    description: "",
  });

  const [newBed, setNewBed] = useState({
    bed_number: "",
    bed_type: "standard",
    daily_rate: 0,
    notes: "",
    ward_id: "",
  });

  const toggleWardExpanded = (wardId: string) => {
    setExpandedWards((prev) => {
      const next = new Set(prev);
      if (next.has(wardId)) {
        next.delete(wardId);
      } else {
        next.add(wardId);
      }
      return next;
    });
  };

  const handleCreateWard = async () => {
    await createWard.mutateAsync({
      hospital_id: hospital.id,
      name: newWard.name,
      type: newWard.type,
      floor: newWard.floor || null,
      description: newWard.description || null,
      total_beds: 0,
      is_active: true,
    });
    setAddWardOpen(false);
    setNewWard({ name: "", type: "general", floor: "", description: "" });
  };

  const handleCreateBed = async () => {
    await createBed.mutateAsync({
      hospital_id: hospital.id,
      ward_id: newBed.ward_id,
      bed_number: newBed.bed_number,
      bed_type: newBed.bed_type,
      daily_rate: newBed.daily_rate,
      notes: newBed.notes || null,
      status: "available",
    });
    setAddBedOpen(false);
    setNewBed({ bed_number: "", bed_type: "standard", daily_rate: 0, notes: "", ward_id: "" });
  };

  const handleUpdateBedStatus = async (bedId: string, status: Bed["status"]) => {
    await updateBed.mutateAsync({ id: bedId, status });
  };

  const getWardBeds = (wardId: string) => beds?.filter((b) => b.ward_id === wardId) || [];

  const getStatusBadge = (status: Bed["status"]) => {
    const statusConfig = BED_STATUSES.find((s) => s.value === status);
    return (
      <Badge variant="outline" className={`${statusConfig?.color} text-white`}>
        {statusConfig?.label}
      </Badge>
    );
  };

  if (wardsLoading || bedsLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  const totalBeds = beds?.length || 0;
  const availableBeds = beds?.filter((b) => b.status === "available").length || 0;
  const occupiedBeds = beds?.filter((b) => b.status === "occupied").length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wards & Beds</h1>
          <p className="text-muted-foreground">Manage hospital wards and bed allocation</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Dialog open={addBedOpen} onOpenChange={setAddBedOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <BedIcon className="h-4 w-4 mr-2" />
                  Add Bed
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Bed</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Ward</Label>
                    <Select value={newBed.ward_id} onValueChange={(v) => setNewBed({ ...newBed, ward_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select ward" />
                      </SelectTrigger>
                      <SelectContent>
                        {wards?.map((ward) => (
                          <SelectItem key={ward.id} value={ward.id}>
                            {ward.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bed Number</Label>
                    <Input
                      value={newBed.bed_number}
                      onChange={(e) => setNewBed({ ...newBed, bed_number: e.target.value })}
                      placeholder="e.g., A-101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bed Type</Label>
                    <Select value={newBed.bed_type} onValueChange={(v) => setNewBed({ ...newBed, bed_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="icu">ICU</SelectItem>
                        <SelectItem value="pediatric">Pediatric</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Daily Rate (৳)</Label>
                    <Input
                      type="number"
                      value={newBed.daily_rate}
                      onChange={(e) => setNewBed({ ...newBed, daily_rate: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newBed.notes}
                      onChange={(e) => setNewBed({ ...newBed, notes: e.target.value })}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddBedOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateBed} disabled={!newBed.ward_id || !newBed.bed_number}>
                    Add Bed
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={addWardOpen} onOpenChange={setAddWardOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Ward
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Ward</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Ward Name</Label>
                    <Input
                      value={newWard.name}
                      onChange={(e) => setNewWard({ ...newWard, name: e.target.value })}
                      placeholder="e.g., General Ward A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={newWard.type}
                      onValueChange={(v) => setNewWard({ ...newWard, type: v as Ward["type"] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WARD_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Floor / Location</Label>
                    <Input
                      value={newWard.floor}
                      onChange={(e) => setNewWard({ ...newWard, floor: e.target.value })}
                      placeholder="e.g., 2nd Floor, Block A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newWard.description}
                      onChange={(e) => setNewWard({ ...newWard, description: e.target.value })}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddWardOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateWard} disabled={!newWard.name}>
                    Add Ward
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Beds</p>
                <p className="text-3xl font-bold">{totalBeds}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BedIcon className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available</p>
                <p className="text-3xl font-bold text-green-600">{availableBeds}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <BedIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Occupied</p>
                <p className="text-3xl font-bold text-red-600">{occupiedBeds}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <BedIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Daily Revenue</p>
                <p className="text-3xl font-bold text-amber-600">
                  ৳{(beds?.filter(b => b.status === "occupied").reduce((sum, b) => sum + (b.daily_rate || 0), 0) || 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <BedIcon className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wards List */}
      <div className="space-y-4">
        {wards?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No wards created yet.</p>
              {isAdmin && <p className="text-sm">Click "Add Ward" to create your first ward.</p>}
            </CardContent>
          </Card>
        ) : (
          wards?.map((ward) => {
            const wardBeds = getWardBeds(ward.id);
            const isExpanded = expandedWards.has(ward.id);
            const available = wardBeds.filter((b) => b.status === "available").length;
            const occupied = wardBeds.filter((b) => b.status === "occupied").length;

            return (
              <Collapsible key={ward.id} open={isExpanded} onOpenChange={() => toggleWardExpanded(ward.id)}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <div>
                          <CardTitle className="text-lg">{ward.name}</CardTitle>
                          <CardDescription>
                            {WARD_TYPES.find((t) => t.value === ward.type)?.label} • {ward.floor || "No floor specified"}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <span className="text-green-600 font-medium">{available} available</span>
                          <span className="text-muted-foreground mx-2">•</span>
                          <span className="text-red-600 font-medium">{occupied} occupied</span>
                          <span className="text-muted-foreground mx-2">•</span>
                          <span>{wardBeds.length} total</span>
                          <span className="text-muted-foreground mx-2">•</span>
                          <span className="text-amber-600 font-medium">
                            ৳{wardBeds.filter(b => b.status === "occupied").reduce((s, b) => s + (b.daily_rate || 0), 0).toLocaleString()}/day
                          </span>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteWard.mutate(ward.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent>
                      {wardBeds.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No beds in this ward yet.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                          {wardBeds.map((bed) => (
                            <div
                              key={bed.id}
                              className="p-3 border rounded-lg flex flex-col items-center gap-2"
                            >
                              <span className="font-medium">{bed.bed_number}</span>
                              {getStatusBadge(bed.status)}
                              <span className="text-xs text-muted-foreground">৳{bed.daily_rate}/day</span>
                              {isAdmin && bed.status !== "occupied" && (
                                <Select
                                  value={bed.status}
                                  onValueChange={(v) => handleUpdateBedStatus(bed.id, v as Bed["status"])}
                                >
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BED_STATUSES.filter((s) => s.value !== "occupied").map((status) => (
                                      <SelectItem key={status.value} value={status.value}>
                                        {status.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}
