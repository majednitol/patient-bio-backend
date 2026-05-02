import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleBasedRedirectPath } from "@/hooks/useRoleBasedRedirect";
import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import LazySection from "@/components/LazySection";
import Footer from "@/components/Footer";

// Lazy loaders for below-fold sections
const loadProblemSolution = () => import("@/components/ProblemSolution");
const loadFeatures = () => import("@/components/Features");
const loadAbout = () => import("@/components/About");
const loadTeam = () => import("@/components/Team");
const loadContact = () => import("@/components/Contact");
const loadCTA = () => import("@/components/CTA");

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const handleRedirect = async () => {
      if (!loading && user && !isRedirecting) {
        setIsRedirecting(true);
        const path = await getRoleBasedRedirectPath(user.id);
        navigate(path);
      }
    };
    handleRedirect();
  }, [user, loading, navigate, isRedirecting]);

  // Show spinner only when we know there's a user to redirect
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Render landing page immediately — don't wait for auth to resolve
  return (
    <div className="min-h-screen">
      <Navigation />
      <Hero />
      <LazySection loader={loadProblemSolution} fallbackHeight="400px" />
      <section id="features">
        <LazySection loader={loadFeatures} fallbackHeight="500px" />
      </section>
      <section id="about">
        <LazySection loader={loadAbout} fallbackHeight="400px" />
      </section>
      <section id="team">
        <LazySection loader={loadTeam} fallbackHeight="500px" />
      </section>
      <section id="contact">
        <LazySection loader={loadContact} fallbackHeight="400px" />
      </section>
      <LazySection loader={loadCTA} fallbackHeight="200px" />
      <Footer />
    </div>
  );
};

export default Index;
