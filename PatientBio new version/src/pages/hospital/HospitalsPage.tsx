import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHospitals, useMyHospitals } from "@/hooks/useHospitals";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Search, MapPin, Phone, ArrowRight, Stethoscope, FlaskConical, Pill, LogIn } from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { HospitalType } from "@/types/hospital";

const HOSPITAL_TYPE_CONFIG: Record<HospitalType, { label: string; icon: React.ElementType; color: string }> = {
  hospital: { label: "Hospital", icon: Building2, color: "bg-blue-500/10 text-blue-600" },
  clinic: { label: "Clinic", icon: Stethoscope, color: "bg-green-500/10 text-green-600" },
  diagnostic: { label: "Diagnostic", icon: FlaskConical, color: "bg-purple-500/10 text-purple-600" },
  pharmacy: { label: "Pharmacy", icon: Pill, color: "bg-orange-500/10 text-orange-600" },
};

export default function HospitalsPage() {
  const { user } = useAuth();
  const { data: hospitals, isLoading } = useHospitals();
  const { data: myHospitals } = useMyHospitals();
  const [search, setSearch] = useState("");

  const filteredHospitals = hospitals?.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.city?.toLowerCase().includes(search.toLowerCase())
  );

  const myHospitalIds = myHospitals?.map((mh) => mh.hospital_id) || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Healthcare Facilities</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find and connect with hospitals, clinics, and healthcare providers in your area
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mb-8 animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <Button asChild size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
            <Link to="/hospitals/register">
<Plus className="h-4 w-4" />
              Register Your Facility
            </Link>
          </Button>
          {!user && (
            <Button asChild size="lg" variant="outline" className="border-secondary text-secondary hover:bg-secondary/10">
              <Link to="/hospitals/login">
                <LogIn className="h-4 w-4" />
                Hospital Login
              </Link>
            </Button>
          )}
        </div>

        {/* My Hospitals Section */}
        {myHospitals && myHospitals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">My Hospitals</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myHospitals.map((staff) => (
                <Card key={staff.id} className="hover:shadow-md transition-all duration-300 hover:scale-[1.02] animate-fade-in" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{staff.hospital?.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {staff.hospital?.city || "Location not set"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {staff.role}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button asChild className="w-full" variant="outline">
                      <Link to={`/hospital/${staff.hospital_id}`}>
                        Open Dashboard
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hospitals by name or city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* All Hospitals */}
        <h2 className="text-xl font-semibold mb-4">All Hospitals</h2>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredHospitals?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {search ? "No results found" : "No hospitals registered yet"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {search 
                  ? "Try a different search term or register a new facility" 
                  : "Be the first to register your healthcare facility and start managing it"}
              </p>
              {!search && (
                <Button asChild className="bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                  <Link to="/hospitals/register">
                    <Plus className="h-4 w-4 mr-2" />
                    Register Your Facility
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredHospitals?.map((hospital) => {
              const typeConfig = HOSPITAL_TYPE_CONFIG[hospital.type || "hospital"];
              const TypeIcon = typeConfig?.icon || Building2;
              
              return (
                <Card key={hospital.id} className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-border/50 animate-fade-in" style={{ animationDelay: `${0.05 * (filteredHospitals?.indexOf(hospital) || 0)}s`, animationFillMode: 'both' }}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${typeConfig?.color || "bg-primary/10 text-primary"}`}>
                          <TypeIcon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-lg truncate">{hospital.name}</CardTitle>
                          {hospital.city && (
                            <CardDescription className="flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{hospital.city}{hospital.state ? `, ${hospital.state}` : ""}</span>
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      {hospital.type && (
                        <Badge variant="secondary" className="capitalize flex-shrink-0">
                          {typeConfig?.label || hospital.type}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {hospital.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mb-4">
                        <Phone className="h-3.5 w-3.5" />
                        {hospital.phone}
                      </p>
                    )}
                    {myHospitalIds.includes(hospital.id) ? (
                      <Button asChild className="w-full" variant="outline">
                        <Link to={`/hospital/${hospital.id}`}>
                          Open Dashboard
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    ) : user ? (
                      <Button asChild className="w-full" variant="secondary">
                        <Link to={`/hospitals/${hospital.id}/apply`}>
                          Apply as Doctor
                        </Link>
                      </Button>
                    ) : (
                      <Button asChild className="w-full" variant="secondary">
                        <Link to="/auth">Sign in to Apply</Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
