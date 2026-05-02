import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent, DEFAULT_CONTACT_INFO, DEFAULT_FAQ_CONTENT, type ContactInfo, type FAQContent } from "@/hooks/useSiteContent";
import { useTranslation } from "react-i18next";

const Contact = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const { data: contactInfoData } = useSiteContent<ContactInfo>("contact_info", DEFAULT_CONTACT_INFO);
  const { data: faqData } = useSiteContent<FAQContent>("faq_content", DEFAULT_FAQ_CONTENT);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: formData.name.trim(), email: formData.email.trim(), subject: formData.subject.trim(), message: formData.message.trim(),
    });
    if (error) {
      toast({ title: t("contact.failedTitle"), description: t("contact.failedDesc"), variant: "destructive" });
    } else {
      toast({ title: t("contact.sentTitle"), description: t("contact.sentDesc") });
      setFormData({ name: "", email: "", subject: "", message: "" });
    }
    setIsSubmitting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const contactInfo = [
    { icon: Mail, title: t("contact.emailUs"), details: contactInfoData.email, description: contactInfoData.emailDescription },
    { icon: Phone, title: t("contact.callUs"), details: contactInfoData.phone, description: contactInfoData.phoneDescription },
    { icon: MapPin, title: t("contact.visitUs"), details: contactInfoData.address, description: contactInfoData.addressDescription },
  ];

  return (
    <section id="contact" className="py-12 sm:py-24 bg-muted/30 dark:bg-muted/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <span className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full bg-accent/10 text-accent text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            💬 {t("contact.getInTouch")}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 px-2">
            {t("contact.title1")}{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">{t("contact.title2")}</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground px-2">{t("contact.subtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-10 sm:mb-16">
          <div className="bg-card dark:bg-card rounded-xl sm:rounded-2xl border border-border/50 dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] p-5 sm:p-8">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-foreground">{t("contact.sendMessage")}</h3>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">{t("contact.nameLabel")}</Label>
                  <Input id="name" name="name" placeholder={t("contact.namePlaceholder")} value={formData.name} onChange={handleChange} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">{t("contact.emailLabel")}</Label>
                  <Input id="email" name="email" type="email" placeholder={t("contact.emailPlaceholder")} value={formData.email} onChange={handleChange} required className="h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-sm">{t("contact.subjectLabel")}</Label>
                <Input id="subject" name="subject" placeholder={t("contact.subjectPlaceholder")} value={formData.subject} onChange={handleChange} required className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="text-sm">{t("contact.messageLabel")}</Label>
                <Textarea id="message" name="message" placeholder={t("contact.messagePlaceholder")} rows={4} value={formData.message} onChange={handleChange} required className="min-h-[120px]" />
              </div>
              <Button type="submit" size="lg" className="w-full bg-gradient-to-r from-primary to-secondary border-0" disabled={isSubmitting}>
                {isSubmitting ? t("contact.sending") : (<><Send className="mr-2 h-5 w-5" />{t("contact.sendBtn")}</>)}
              </Button>
            </form>
          </div>

          <div className="space-y-6 sm:space-y-8">
            <div className="space-y-3 sm:space-y-4">
              {contactInfo.map((info, index) => (
                <div key={index} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-card dark:bg-card border border-border/50 dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center flex-shrink-0">
                    <info.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm sm:text-base text-foreground">{info.title}</h4>
                    <p className="text-foreground text-sm sm:text-base break-all">{info.details}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{info.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-card dark:bg-card rounded-xl sm:rounded-2xl border border-border/50 dark:border-border/60 dark:shadow-[0_2px_8px_rgba(0,0,0,0.3)] p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-foreground">{t("contact.quickAnswers")}</h3>
              <div className="space-y-3 sm:space-y-4">
                {faqData.faqs.map((faq, index) => (
                  <div key={index}>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-sm sm:text-base text-foreground">{faq.question}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground">{faq.answer}</p>
                      </div>
                    </div>
                    {index < faqData.faqs.length - 1 && <div className="border-b border-border/50 dark:border-border/60 mt-3 sm:mt-4" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
