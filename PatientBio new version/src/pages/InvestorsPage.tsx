import Navigation from "@/components/Navigation";
import Investors from "@/components/Investors";
import Footer from "@/components/Footer";

const InvestorsPage = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-16">
        <Investors />
      </div>
      <Footer />
    </div>
  );
};

export default InvestorsPage;
