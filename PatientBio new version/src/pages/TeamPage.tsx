import Navigation from "@/components/Navigation";
import Team from "@/components/Team";
import Footer from "@/components/Footer";

const TeamPage = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-16">
        <Team />
      </div>
      <Footer />
    </div>
  );
};

export default TeamPage;
