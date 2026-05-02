import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Building2, Settings, LogIn } from "lucide-react";

interface RegistrationSuccessProps {
  hospitalId: string;
  hospitalName: string;
  isGuest?: boolean;
}

export default function RegistrationSuccess({
  hospitalId,
  hospitalName,
  isGuest = false,
}: RegistrationSuccessProps) {
  const navigate = useNavigate();

  return (
    <div className="text-center py-8">
      {/* Success Animation */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
        <div className="relative w-full h-full bg-primary rounded-full flex items-center justify-center">
          <CheckCircle2 className="h-12 w-12 text-primary-foreground" />
        </div>
      </div>

      <h2 className="text-3xl font-bold mb-2">Registration Complete!</h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        <strong>{hospitalName}</strong> has been successfully registered on the
        platform.
      </p>

      {/* Summary Card */}
      <Card className="mb-8 max-w-md mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-lg">{hospitalName}</h3>
              <p className="text-sm text-muted-foreground">
                {isGuest ? "Sign in to manage your facility" : "Ready to accept doctor applications"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <div className="space-y-3 max-w-md mx-auto">
        {isGuest ? (
          <>
            <Button asChild className="w-full" size="lg">
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In to Manage Facility
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/hospitals">
                Browse All Hospitals
              </Link>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
              Create an account or sign in to claim and manage your facility.
            </p>
          </>
        ) : (
          <>
            <Button
              onClick={() => navigate(`/hospital/${hospitalId}`)}
              className="w-full"
              size="lg"
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>

            <Button
              onClick={() => navigate(`/hospital/${hospitalId}/settings`)}
              variant="outline"
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Complete Your Profile
            </Button>

            <p className="mt-4 text-sm text-muted-foreground">
              Add more details like description, logo, and operating hours to make
              your facility stand out.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
