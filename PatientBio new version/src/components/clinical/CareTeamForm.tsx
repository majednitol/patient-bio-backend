import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AutoPopulatedBadge } from "./AutoPopulatedBadge";
import { useCareTeam } from "@/hooks/useClinicalRecords";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Plus, Trash2, UserCheck, Star, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const EMPTY_FORM = {
  physician_name: "", specialty: "", contact_info: "", referral_date: format(new Date(), "yyyy-MM-dd"), notes: "", is_primary: false,
};

export function CareTeamForm() {
  const { t } = useTranslation();
  const { data: team, isLoading, add, update, remove, adding } = useCareTeam();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const resetForm = () => { setForm({ ...EMPTY_FORM }); setShowAdd(false); setEditId(null); };

  const startEdit = (m: any) => {
    setEditId(m.id);
    setForm({
      physician_name: m.physician_name ?? "",
      specialty: m.specialty ?? "",
      contact_info: m.contact_info ?? "",
      referral_date: m.referral_date ?? format(new Date(), "yyyy-MM-dd"),
      notes: m.notes ?? "",
      is_primary: m.is_primary ?? false,
    });
    setShowAdd(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, notes: form.notes || null };
    if (editId) {
      await update({ id: editId, ...payload });
    } else {
      await add(payload);
    }
    resetForm();
  };

  const togglePrimary = async (id: string, current: boolean) => {
    await update({ id, is_primary: !current });
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between px-0 py-2 sm:px-6 sm:pb-6">
          <div>
            <CardTitle className="text-base sm:text-lg">{t("clinicalRecords.careTeam.title")}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{t("clinicalRecords.careTeam.description")}</CardDescription>
          </div>
          {!showAdd && <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" /> {t("clinicalRecords.add")}</Button>}
        </CardHeader>
        {showAdd && (
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t("clinicalRecords.careTeam.physicianName")}</Label><Input value={form.physician_name} onChange={(e) => setForm((p) => ({ ...p, physician_name: e.target.value }))} required /></div>
                <div className="space-y-2"><Label>{t("clinicalRecords.careTeam.specialty")}</Label><Input value={form.specialty} onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))} placeholder={t("clinicalRecords.careTeam.specialtyPlaceholder")} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t("clinicalRecords.careTeam.contactInfo")}</Label><Input value={form.contact_info} onChange={(e) => setForm((p) => ({ ...p, contact_info: e.target.value }))} placeholder={t("clinicalRecords.careTeam.contactInfoPlaceholder")} /></div>
                <div className="space-y-2"><Label>{t("clinicalRecords.careTeam.referralDate")}</Label><Input type="date" value={form.referral_date} onChange={(e) => setForm((p) => ({ ...p, referral_date: e.target.value }))} /></div>
              </div>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder={t("clinicalRecords.careTeam.notesPlaceholder")} rows={2} />
              <div className="flex gap-2">
                <Button type="submit" disabled={adding || !form.physician_name}>{adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editId ? t("clinicalRecords.careTeam.updatePhysician") : t("clinicalRecords.careTeam.addPhysician")}</Button>
                <Button type="button" variant="outline" onClick={resetForm}>{t("clinicalRecords.cancel")}</Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {team && team.length > 0 && (
        <div className="space-y-2">
          {team.map((m: any) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <UserCheck className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{m.physician_name}</span>
                      {m.specialty && <Badge variant="secondary" className="text-xs">{m.specialty}</Badge>}
                      {m.is_primary && <Badge className="text-xs gap-1"><Star className="h-3 w-3" /> {t("clinicalRecords.careTeam.primary")}</Badge>}
                      <AutoPopulatedBadge source={m.source} sourceRef={m.source_ref} compact />
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {m.contact_info && <span>{m.contact_info}</span>}
                      {m.referral_date && <span className="ml-2">{t("clinicalRecords.careTeam.referred")}: {m.referral_date}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => togglePrimary(m.id, m.is_primary)}>
                    {m.is_primary ? t("clinicalRecords.careTeam.removePrimary") : t("clinicalRecords.careTeam.setPrimary")}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(m)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {team && team.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground text-center py-6">{t("clinicalRecords.careTeam.noPhysicians")}</p>
      )}
    </div>
  );
}
