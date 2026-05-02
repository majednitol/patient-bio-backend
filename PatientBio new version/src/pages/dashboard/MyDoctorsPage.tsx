import { formatDoctorName } from "@/utils/formatDoctorName";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Edit, Trash2, Phone, Mail, Building2, Stethoscope, Loader2, ShieldCheck, Clock, XCircle, QrCode } from "lucide-react";
import { useDoctorConnections, DoctorConnection } from "@/hooks/useDoctorConnections";
import { usePatientDoctorAccess } from "@/hooks/usePatientDoctorAccess";
import { ConnectToDoctorDialog } from "@/components/dashboard/ConnectToDoctorDialog";
import { format, formatDistanceToNow } from "date-fns";

interface DoctorFormData {
  doctor_name: string;
  specialty: string;
  hospital_clinic: string;
  phone: string;
  email: string;
  notes: string;
}

const emptyFormData: DoctorFormData = {
  doctor_name: "",
  specialty: "",
  hospital_clinic: "",
  phone: "",
  email: "",
  notes: "",
};

const MyDoctorsPage = () => {
  const { t } = useTranslation();
  const { doctors, isLoading, createDoctor, isCreating, updateDoctor, isUpdating, deleteDoctor, isDeleting } = useDoctorConnections();
  const { accessRecords, isLoading: accessLoading, revokeAccess, isRevoking } = usePatientDoctorAccess();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<DoctorConnection | null>(null);
  const [formData, setFormData] = useState<DoctorFormData>(emptyFormData);

  const handleOpenAdd = () => {
    setFormData(emptyFormData);
    setEditingDoctor(null);
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (doctor: DoctorConnection) => {
    setFormData({
      doctor_name: doctor.doctor_name,
      specialty: doctor.specialty || "",
      hospital_clinic: doctor.hospital_clinic || "",
      phone: doctor.phone || "",
      email: doctor.email || "",
      notes: doctor.notes || "",
    });
    setEditingDoctor(doctor);
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setEditingDoctor(null);
    setFormData(emptyFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.doctor_name.trim()) return;

    if (editingDoctor) {
      updateDoctor(
        { id: editingDoctor.id, ...formData },
        { onSuccess: handleCloseDialog }
      );
    } else {
      createDoctor(formData, { onSuccess: handleCloseDialog });
    }
  };

  const handleInputChange = (field: keyof DoctorFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading || accessLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Connect with Doctor by ID */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader className="pb-3 px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <QrCode className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                {t("doctorsPage.connectWithDoctor")}
              </CardTitle>
              <CardDescription className="text-sm">
                {t("doctorsPage.enterDoctorIdDesc")}
              </CardDescription>
            </div>
            <Button onClick={() => setIsConnectDialogOpen(true)} className="bg-gradient-to-r from-primary to-secondary border-0 w-full sm:w-auto touch-target">
              <QrCode className="mr-2 h-4 w-4" />
              {t("doctorsPage.enterDoctorId")}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Hospital Doctors with Access */}
      {accessRecords.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="px-4 sm:px-6">
             <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              {t("doctorsPage.doctorsWithAccess")}
            </CardTitle>
            <CardDescription className="text-sm">
              {t("doctorsPage.doctorsWithAccessDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-3">
              {accessRecords.map((access) => (
                <div
                  key={access.id}
                  className="flex items-center justify-between gap-2 p-2.5 sm:p-4 rounded-lg bg-muted/50 border press-feedback"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
                      <AvatarImage src={access.doctor_profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10">
                        <Stethoscope className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {formatDoctorName(access.doctor_profile?.full_name)}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        {access.doctor_profile?.specialty && (
                          <span className="truncate">{access.doctor_profile.specialty}</span>
                        )}
                        {access.hospital_name && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="flex items-center gap-1 truncate">
                              <Building2 className="h-3 w-3 flex-shrink-0" />
                              {access.hospital_name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right text-xs text-muted-foreground hidden sm:block">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Granted {formatDistanceToNow(new Date(access.granted_at), { addSuffix: true })}
                      </div>
                      {access.last_accessed_at && (
                        <div>
                          Last viewed {formatDistanceToNow(new Date(access.last_accessed_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive hover:bg-destructive hover:text-destructive-foreground h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>{t("doctorsPage.revokeAccess")}</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t("doctorsPage.revokeDoctorAccess")}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("doctorsPage.revokeDoctorAccessDesc", { name: formatDoctorName(access.doctor_profile?.full_name) })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => revokeAccess(access.id)}
                            disabled={isRevoking}
                          >
                            {t("doctorsPage.revokeAccess")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Doctors */}
      <Card>
        <CardHeader className="px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                {t("doctorsPage.myDoctors")}
              </CardTitle>
              <CardDescription className="text-sm">
                {t("doctorsPage.providersConnected", { count: doctors.length })}
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAdd} className="bg-gradient-to-r from-primary to-secondary border-0 w-full sm:w-auto touch-target">
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("doctorsPage.addDoctor")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingDoctor ? t("doctorsPage.editDoctor") : t("doctorsPage.addNewDoctor")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingDoctor
                        ? t("doctorsPage.updateProviderInfo")
                        : t("doctorsPage.addProviderToList")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="doctor_name">{t("doctorsPage.doctorName")}</Label>
                      <Input
                        id="doctor_name"
                        placeholder="e.g., Dr. Fatema Akter"
                        value={formData.doctor_name}
                        onChange={(e) => handleInputChange("doctor_name", e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="specialty">{t("doctorsPage.specialty")}</Label>
                        <Input
                          id="specialty"
                          placeholder="e.g., Cardiology"
                          value={formData.specialty}
                          onChange={(e) => handleInputChange("specialty", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="hospital_clinic">{t("doctorsPage.hospitalClinic")}</Label>
                        <Input
                          id="hospital_clinic"
                          placeholder="e.g., City Hospital"
                          value={formData.hospital_clinic}
                          onChange={(e) => handleInputChange("hospital_clinic", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">{t("doctorsPage.phone")}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+880 1XXX-XXXXXX"
                          value={formData.phone}
                          onChange={(e) => handleInputChange("phone", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{t("doctorsPage.email")}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="doctor@clinic.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">{t("doctorsPage.notes")}</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional notes about this provider..."
                        value={formData.notes}
                        onChange={(e) => handleInputChange("notes", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      {t("common.cancel")}
                    </Button>
                    <Button type="submit" disabled={isCreating || isUpdating || !formData.doctor_name.trim()}>
                      {isCreating || isUpdating ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                      ) : editingDoctor ? (
                        t("doctorsPage.update")
                      ) : (
                        t("doctorsPage.addDoctor")
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <UserPlus className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-base sm:text-lg mb-2">{t("doctorsPage.noSavedProviders")}</h3>
              <p className="text-muted-foreground max-w-md mb-6 text-sm">
                {t("doctorsPage.noSavedProvidersDesc")}
              </p>
              <Button onClick={handleOpenAdd} className="bg-gradient-to-r from-primary to-secondary border-0 touch-target">
                <UserPlus className="mr-2 h-4 w-4" />
                {t("doctorsPage.addFirstDoctor")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {doctors.map((doctor) => (
                <Card key={doctor.id} className="overflow-hidden rounded-xl hover:shadow-md transition-all duration-200 border-border/60 press-feedback">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0">
                          <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm sm:text-base truncate">{doctor.doctor_name}</h4>
                          {doctor.specialty && (
                            <p className="text-xs sm:text-sm text-muted-foreground">{doctor.specialty}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleOpenEdit(doctor)}>
                          <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("doctorsPage.deleteDoctor")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("doctorsPage.deleteDoctorDesc", { name: doctor.doctor_name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteDoctor(doctor.id)}
                                disabled={isDeleting}
                              >
                                {t("familyPage.remove")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-sm">
                      {doctor.hospital_clinic && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5" />
                          <span className="truncate">{doctor.hospital_clinic}</span>
                        </div>
                      )}
                      {doctor.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-3.5 w-3.5" />
                          <a href={`tel:${doctor.phone}`} className="hover:text-primary truncate">
                            {doctor.phone}
                          </a>
                        </div>
                      )}
                      {doctor.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          <a href={`mailto:${doctor.email}`} className="hover:text-primary truncate">
                            {doctor.email}
                          </a>
                        </div>
                      )}
                    </div>

                    {doctor.notes && (
                      <p className="mt-3 text-xs text-muted-foreground bg-muted/50 rounded p-2 line-clamp-2">
                        {doctor.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Connect to Doctor Dialog */}
      <ConnectToDoctorDialog
        open={isConnectDialogOpen}
        onOpenChange={setIsConnectDialogOpen}
      />
    </div>
  );
};

export default MyDoctorsPage;
