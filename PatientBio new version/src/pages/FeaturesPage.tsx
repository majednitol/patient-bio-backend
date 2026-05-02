import Navigation from "@/components/Navigation";
import Features from "@/components/Features";
import Footer from "@/components/Footer";

const FeaturesPage = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-16">
        <Features />
      </div>
      <Footer />
    </div>
  );
};

export default FeaturesPage;
