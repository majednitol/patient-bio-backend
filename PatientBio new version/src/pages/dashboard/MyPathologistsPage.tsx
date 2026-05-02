import { usePatientConnectedPathologists } from "@/hooks/usePatientConnectedPathologists";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Microscope, FileText, Loader2, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const MyPathologistsPage = () => {
  const { t } = useTranslation();
  const { data: pathologists = [], isLoading } = usePatientConnectedPathologists();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 sm:py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("pathologistsPage.loadingPathologists")}</p>
      </div>
    );
  }

  if (pathologists.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Microscope className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg">{t("pathologistsPage.noConnectedPathologists")}</h3>
          <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
            {t("pathologistsPage.noConnectedPathologistsDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {pathologists.map((p) => (
          <Card key={p.id} className="hover:shadow-md transition-shadow press-feedback">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-start gap-2.5 sm:gap-4">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {p.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm sm:text-base truncate">{p.full_name}</h4>
                  {p.lab_name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building2 className="h-3 w-3" />
                      {p.lab_name}
                    </p>
                  )}
                  {p.specialization_area && (
                    <Badge variant="outline" className="text-xs mt-2 capitalize">
                      {p.specialization_area}
                    </Badge>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground">
                      <FileText className="h-3 w-3 mr-1" />
                      {p.reportCount} report{p.reportCount !== 1 ? "s" : ""}
                    </Badge>
                    <Button variant="ghost" size="sm" className="text-primary" asChild>
                      <Link to="/dashboard/lab-reports">{t("pathologistsPage.viewReports")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MyPathologistsPage;
