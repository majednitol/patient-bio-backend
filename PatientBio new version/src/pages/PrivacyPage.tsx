import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Database } from "lucide-react";
import patientBioLogo from "@/assets/patient-bio-logo.jpg";
import { Button } from "@/components/ui/button";

const PrivacyPage = () => {
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
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: February 2026</p>

        {/* Privacy Highlights */}
        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <div className="bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Your Data, Your Control</h3>
              <p className="text-sm text-muted-foreground">You own 100% of your health data</p>
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">End-to-End Encryption</h3>
              <p className="text-sm text-muted-foreground">Military-grade security for your records</p>
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">No Data Selling</h3>
              <p className="text-sm text-muted-foreground">We never sell your information</p>
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">HIPAA Compliant</h3>
              <p className="text-sm text-muted-foreground">Meeting healthcare data standards</p>
            </div>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              At Patient Bio, we understand that your health information is deeply personal. This Privacy 
              Policy explains how we collect, use, protect, and share your information when you use our 
              health record management platform. We are committed to protecting your privacy and ensuring 
              you have control over your personal health data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We collect the following types of information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Account Information:</strong> Email address, name, and password (encrypted)</li>
              <li><strong>Health Records:</strong> Documents, images, and data you upload to our platform</li>
              <li><strong>Profile Information:</strong> Emergency contacts, medical preferences, and profile details</li>
              <li><strong>Usage Data:</strong> How you interact with our platform to improve our services</li>
              <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers for security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We use your information to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and maintain our health record management services</li>
              <li>Enable secure sharing of records with authorized healthcare providers</li>
              <li>Facilitate emergency access when you've configured it</li>
              <li>Send important service updates and security notifications</li>
              <li>Improve our platform based on aggregated, anonymized usage patterns</li>
              <li>Comply with legal obligations and protect against fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-leading security measures to protect your health information:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-4">
              <li>AES-256 encryption for data at rest</li>
              <li>TLS 1.3 encryption for data in transit</li>
              <li>Multi-factor authentication options</li>
              <li>Regular security audits and penetration testing</li>
              <li>SOC 2 Type II certified infrastructure</li>
              <li>Automatic session timeouts and suspicious activity monitoring</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We do not sell your personal health information. We may share your data only in these circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>With Your Consent:</strong> When you explicitly share records with healthcare providers</li>
              <li><strong>Emergency Access:</strong> With designated emergency contacts when triggered</li>
              <li><strong>Service Providers:</strong> With trusted partners who help operate our platform (under strict confidentiality)</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You have the following rights regarding your data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> View and download all your health records at any time</li>
              <li><strong>Portability:</strong> Export your data in standard formats</li>
              <li><strong>Correction:</strong> Update or correct your personal information</li>
              <li><strong>Deletion:</strong> Request permanent deletion of your account and data</li>
              <li><strong>Restriction:</strong> Limit how we process your information</li>
              <li><strong>Objection:</strong> Opt out of certain data processing activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your health records for as long as your account is active. Upon account deletion, 
              we will permanently remove your data within 30 days, except where retention is required by law. 
              Anonymized, aggregated data may be retained for analytical purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our services are not intended for children under 13. We do not knowingly collect personal 
              information from children. Parents or guardians may create accounts to manage their minor 
              children's health records with appropriate consent mechanisms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your data may be processed in countries other than your own. We ensure appropriate safeguards 
              are in place, including Standard Contractual Clauses, to protect your information in compliance 
              with applicable data protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy periodically. We will notify you of significant changes 
              via email or through our platform. Your continued use of our services after changes constitutes 
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions or to exercise your rights, contact our Privacy Team at{" "}
              <a href="mailto:privacy@patientbio.com" className="text-primary hover:underline">
                privacy@patientbio.com
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

export default PrivacyPage;
