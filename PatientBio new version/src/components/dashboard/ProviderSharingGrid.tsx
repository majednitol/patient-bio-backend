import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, Stethoscope, Building2, Microscope, Briefcase, Pill, Landmark, FlaskConical, ChevronRight, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAccessTokens } from "@/hooks/useAccessTokens";
import { usePatientResearcherShares } from "@/hooks/usePatientResearcherShares";
import { DoctorConnection } from "@/hooks/useDoctorConnections";
import ShareWithDoctorDialog from "@/components/dashboard/ShareWithDoctorDialog";
import ShareWithHospitalDialog from "@/components/dashboard/ShareWithHospitalDialog";
import ShareWithPathologistDialog from "@/components/dashboard/ShareWithPathologistDialog";
import ShareWithInsuranceDialog from "@/components/dashboard/ShareWithInsuranceDialog";
import ShareWithPharmacyDialog from "@/components/dashboard/ShareWithPharmacyDialog";
import ShareWithGovernmentDialog from "@/components/dashboard/ShareWithGovernmentDialog";
import ShareWithAdminDialog from "@/components/dashboard/ShareWithAdminDialog";
import ShareWithResearcherDialog from "@/components/dashboard/ShareWithResearcherDialog";

interface ProviderDef {
  id: string;
  label: string;
  desc: string;
  icon: React.ElementType;
  category: "clinical" | "stakeholder" | "research";
  colorClass: string;
  bgClass: string;
}

const ProviderCard = ({
  icon: Icon,
  label,
  desc,
  colorClass,
  bgClass,
  activeCount,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  colorClass: string;
  bgClass: string;
  activeCount: number;
}) => (
  <div className="w-full text-left border border-border/60 rounded-xl p-3 sm:p-4 hover:border-primary/30 hover:shadow-sm transition-all press-feedback group bg-card cursor-pointer">
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl ${bgClass} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm leading-tight truncate">{label}</p>
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] shrink-0">
              {activeCount}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1 group-hover:text-primary transition-colors" />
    </div>
  </div>
);

interface ProviderSharingGridProps {
  doctors: DoctorConnection[];
  doctorsLoading: boolean;
}

const ProviderSharingGrid = ({ doctors, doctorsLoading }: ProviderSharingGridProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { tokens, isTokenActive } = useAccessTokens();
  const { activePatientShares } = usePatientResearcherShares();

  const providers: ProviderDef[] = useMemo(() => [
    { id: "doctor", label: t("shareDialogs.shareWithDoctor"), desc: t("providerGrid.doctorDesc", "Share records with your connected doctors"), icon: Stethoscope, category: "clinical", colorClass: "text-primary", bgClass: "bg-primary/10" },
    { id: "hospital", label: t("shareDialogs.shareWithHospital"), desc: t("providerGrid.hospitalDesc", "Full clinical records for hospital admissions"), icon: Building2, category: "clinical", colorClass: "text-blue-600 dark:text-blue-400", bgClass: "bg-blue-500/10" },
    { id: "pathologist", label: t("shareDialogs.shareWithPathologist"), desc: t("providerGrid.pathologistDesc", "Share lab results and diagnostic data"), icon: Microscope, category: "clinical", colorClass: "text-violet-600 dark:text-violet-400", bgClass: "bg-violet-500/10" },
    { id: "insurance", label: t("shareDialogs.shareWithInsurance"), desc: t("providerGrid.insuranceDesc", "Claims-relevant health records for insurers"), icon: Briefcase, category: "stakeholder", colorClass: "text-amber-600 dark:text-amber-400", bgClass: "bg-amber-500/10" },
    { id: "pharmacy", label: t("shareDialogs.shareWithPharmacy"), desc: t("providerGrid.pharmacyDesc", "Prescriptions and allergy info for pickup"), icon: Pill, category: "stakeholder", colorClass: "text-emerald-600 dark:text-emerald-400", bgClass: "bg-emerald-500/10" },
    { id: "government", label: t("shareDialogs.shareWithGovernment"), desc: t("providerGrid.governmentDesc", "Public health reporting and vaccination records"), icon: Landmark, category: "stakeholder", colorClass: "text-sky-600 dark:text-sky-400", bgClass: "bg-sky-500/10" },
    { id: "admin", label: t("shareDialogs.shareWithAdmin"), desc: t("providerGrid.adminDesc", "Share data with platform administrators"), icon: ShieldCheck, category: "stakeholder", colorClass: "text-slate-600 dark:text-slate-400", bgClass: "bg-slate-500/10" },
    { id: "researcher", label: t("shareDialogs.shareForResearch"), desc: t("providerGrid.researcherDesc", "Contribute anonymized data to clinical research"), icon: FlaskConical, category: "research", colorClass: "text-rose-600 dark:text-rose-400", bgClass: "bg-rose-500/10" },
  ], [t]);

  // Count active shares by provider type based on token labels
  const shareCounts = useMemo(() => {
    const active = tokens.filter(isTokenActive);
    const counts: Record<string, number> = {};
    const matchers: Record<string, string[]> = {
      doctor: ["doctor", "dr."],
      hospital: ["hospital"],
      pathologist: ["pathologist", "lab", "diagnostic"],
      insurance: ["insurance", "insurer"],
      pharmacy: ["pharmacy", "prescription"],
      government: ["gov", "government", "public health"],
      admin: ["admin"],
    };

    for (const [id, keywords] of Object.entries(matchers)) {
      counts[id] = active.filter(t => {
        const label = (t.label || "").toLowerCase();
        return keywords.some(k => label.includes(k));
      }).length;
    }
    counts.researcher = activePatientShares?.length || 0;
    return counts;
  }, [tokens, isTokenActive, activePatientShares]);

  const filtered = useMemo(() => {
    if (!search.trim()) return providers;
    const q = search.toLowerCase();
    return providers.filter(p =>
      p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.id.includes(q)
    );
  }, [search, providers]);

  const categories = [
    { key: "clinical" as const, labelKey: "shareDataPage.clinicalProviders" },
    { key: "stakeholder" as const, labelKey: "shareDataPage.otherStakeholders" },
    { key: "research" as const, labelKey: "shareDataPage.research" },
  ];

  const renderProviderCard = (p: ProviderDef) => (
    <ProviderCard
      icon={p.icon}
      label={p.label}
      desc={p.desc}
      colorClass={p.colorClass}
      bgClass={p.bgClass}
      activeCount={shareCounts[p.id] || 0}
    />
  );

  const renderProvider = (p: ProviderDef) => {
    const card = renderProviderCard(p);
    switch (p.id) {
      case "doctor":
        return <ShareWithDoctorDialog key={p.id} doctors={doctors} doctorsLoading={doctorsLoading} trigger={card} />;
      case "hospital":
        return <ShareWithHospitalDialog key={p.id} trigger={card} />;
      case "pathologist":
        return <ShareWithPathologistDialog key={p.id} trigger={card} />;
      case "insurance":
        return <ShareWithInsuranceDialog key={p.id} trigger={card} />;
      case "pharmacy":
        return <ShareWithPharmacyDialog key={p.id} trigger={card} />;
      case "government":
        return <ShareWithGovernmentDialog key={p.id} trigger={card} />;
      case "admin":
        return <ShareWithAdminDialog key={p.id} trigger={card} />;
      case "researcher":
        return <ShareWithResearcherDialog key={p.id} trigger={card} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("providerGrid.searchProviders", "Search providers...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {categories.map(cat => {
        const allItems = providers.filter(p => p.category === cat.key);
        const visibleIds = new Set(filtered.filter(p => p.category === cat.key).map(p => p.id));
        if (visibleIds.size === 0 && search.trim()) return null;

        return (
          <div key={cat.key} className="space-y-2" style={visibleIds.size === 0 ? { display: "none" } : undefined}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t(cat.labelKey)}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {allItems.map(p => (
                <div key={p.id} style={visibleIds.has(p.id) ? undefined : { display: "none" }}>
                  {renderProvider(p)}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {t("providerGrid.noResults", "No providers match your search")}
        </div>
      )}
    </div>
  );
};

export default ProviderSharingGrid;
