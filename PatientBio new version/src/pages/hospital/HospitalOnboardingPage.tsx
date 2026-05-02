import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { HospitalType } from "@/types/hospital";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Loader2, Shield, Clock, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import RegistrationSteps from "@/components/hospital/RegistrationSteps";
import StepBasicInfo from "@/components/hospital/StepBasicInfo";
import StepLocation from "@/components/hospital/StepLocation";
import StepContact from "@/components/hospital/StepContact";
import RegistrationSuccess from "@/components/hospital/RegistrationSuccess";

const STEPS = [
  { id: 1, title: "Basic Info", description: "Facility details" },
  { id: 2, title: "Location", description: "Address info" },
  { id: 3, title: "Contact", description: "How to reach you" },
];

interface FormData {
  name: string;
  type: HospitalType;
  registration_number: string;
  city: string;
  state: string;
  address: string;
  country: string;
  phone: string;
  email: string;
  website: string;
}

const initialFormData: FormData = {
  name: "",
  type: "hospital",
  registration_number: "",
  city: "",
  state: "",
  address: "",
  country: "Bangladesh",
  phone: "",
  email: "",
  website: "",
};

export default function HospitalOnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredHospital, setRegisteredHospital] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim() || formData.name.trim().length < 2) {
        newErrors.name = "Facility name must be at least 2 characters";
      }
    }

    if (step === 2) {
      if (!formData.city.trim() || formData.city.trim().length < 2) {
        newErrors.city = "City must be at least 2 characters";
      }
    }

    if (step === 3) {
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
        newErrors.website = "Please enter a valid URL starting with http:// or https://";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;

    if (currentStep === 3) {
      handleSubmit();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("register-hospital", {
        body: {
          name: formData.name.trim(),
          type: formData.type,
          registration_number: formData.registration_number.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim() || undefined,
          address: formData.address.trim() || undefined,
          country: formData.country.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          website: formData.website.trim() || undefined,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Registration successful!",
        description: `${data.hospital.name} has been registered.`,
      });

      setRegisteredHospital({ id: data.hospital.id, name: data.hospital.name });
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // Clear errors for updated fields
    const clearedErrors = { ...errors };
    Object.keys(data).forEach((key) => delete clearedErrors[key]);
    setErrors(clearedErrors);
  };

  // Show success screen
  if (registeredHospital) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-8 max-w-2xl">
          <RegistrationSuccess
            hospitalId={registeredHospital.id}
            hospitalName={registeredHospital.name}
            isGuest={!user}
          />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 pt-24 pb-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/hospitals")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Hospitals
        </Button>

        <div className="max-w-2xl mx-auto">
          {/* Hero Section - Only show on first step */}
          {currentStep === 1 && (
            <div className="text-center mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold mb-3">
                Register Your Healthcare Facility
              </h1>
              <p className="text-muted-foreground mb-6">
                Join our network and start managing your facility in minutes
              </p>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Setup in 2 minutes</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>No account required</span>
                </div>
              </div>
            </div>
          )}

          {/* Progress Steps */}
          <div className="mb-8">
            <RegistrationSteps steps={STEPS} currentStep={currentStep} />
          </div>

          {/* Form Card */}
          <Card>
            <CardContent className="p-6 sm:p-8">
              {currentStep === 1 && (
                <StepBasicInfo
                  data={{
                    name: formData.name,
                    type: formData.type,
                    registration_number: formData.registration_number,
                  }}
                  onChange={updateFormData}
                  errors={errors}
                />
              )}

              {currentStep === 2 && (
                <StepLocation
                  data={{
                    city: formData.city,
                    state: formData.state,
                    address: formData.address,
                    country: formData.country,
                  }}
                  onChange={updateFormData}
                  errors={errors}
                />
              )}

              {currentStep === 3 && (
                <StepContact
                  data={{
                    phone: formData.phone,
                    email: formData.email,
                    website: formData.website,
                  }}
                  onChange={updateFormData}
                  errors={errors}
                />
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1 || isSubmitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Registering...
                    </>
                  ) : currentStep === 3 ? (
                    "Complete Registration"
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
