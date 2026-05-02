import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";
import { Button } from "@/components/ui/button";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={patientBioLogo} alt="Patient Bio" className="w-10 h-10 rounded-xl object-cover" />
            <span className="text-xl font-bold">Patient Bio</span>
          </Link>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Patient Bio's services, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services. We reserve the right to 
              modify these terms at any time, and your continued use of the service constitutes acceptance 
              of any modifications.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Patient Bio provides a secure platform for individuals to store, manage, and share their 
              personal health records. Our services include health document storage, secure provider sharing, 
              emergency access features, and health data management tools. We are committed to maintaining 
              the highest standards of data security and privacy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              As a user of Patient Bio, you agree to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate and complete information when creating your account</li>
              <li>Maintain the security of your account credentials</li>
              <li>Only upload health records that you own or have authorization to manage</li>
              <li>Use the service in compliance with all applicable laws and regulations</li>
              <li>Not attempt to access other users' data without authorization</li>
              <li>Report any security vulnerabilities or unauthorized access immediately</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Health Information Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              Patient Bio is a health record management platform and does not provide medical advice, 
              diagnosis, or treatment. The information stored on our platform is provided by you and 
              your healthcare providers. Always consult qualified healthcare professionals for medical 
              advice. We are not responsible for any medical decisions made based on information stored 
              in or accessed through our platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Ownership</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain full ownership of all health records and personal data you upload to Patient Bio. 
              We do not claim any ownership rights over your health information. You have the right to 
              access, export, or delete your data at any time. We will never sell your personal health 
              information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Sharing and Access Controls</h2>
            <p className="text-muted-foreground leading-relaxed">
              You control who can access your health records through our sharing features. When you share 
              records with healthcare providers or emergency contacts, you are responsible for ensuring 
              the recipients are authorized to receive such information. Shared links may have expiration 
              dates and access restrictions as configured by you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain 99.9% service availability but do not guarantee uninterrupted access. 
              We may perform scheduled maintenance with advance notice when possible. We are not liable 
              for any damages resulting from service interruptions or data unavailability during emergencies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Patient Bio shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages arising from your use of our services. 
              Our total liability shall not exceed the amount you paid for our services in the twelve months 
              preceding any claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may terminate your account at any time. We reserve the right to suspend or terminate 
              accounts that violate these terms. Upon termination, you will have 30 days to export your 
              data before it is permanently deleted from our systems.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms of Service, please contact us at{" "}
              <a href="mailto:legal@patientbio.com" className="text-primary hover:underline">
                legal@patientbio.com
              </a>{" "}
              or through our{" "}
              <Link to="/contact" className="text-primary hover:underline">
                contact page
              </Link>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 Patient Bio. All rights reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
