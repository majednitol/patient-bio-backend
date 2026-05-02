import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Mail, HelpCircle, Loader2, Save, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSiteContent,
  DEFAULT_HERO_STATS,
  DEFAULT_CONTACT_INFO,
  DEFAULT_FAQ_CONTENT,
  type HeroStats,
  type ContactInfo,
  type FAQContent,
} from "@/hooks/useSiteContent";

function ContentSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        ))}
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}

export default function ContentPage() {
  const { toast } = useToast();

  // Hero Stats
  const heroStats = useSiteContent<HeroStats>("hero_stats", DEFAULT_HERO_STATS);
  const [statsForm, setStatsForm] = useState<HeroStats["stats"]>(heroStats.data.stats);

  // Contact Info
  const contactInfo = useSiteContent<ContactInfo>("contact_info", DEFAULT_CONTACT_INFO);
  const [contactForm, setContactForm] = useState<ContactInfo>(contactInfo.data);

  // FAQ Content
  const faqContent = useSiteContent<FAQContent>("faq_content", DEFAULT_FAQ_CONTENT);
  const [faqForm, setFaqForm] = useState<FAQContent["faqs"]>(faqContent.data.faqs);

  // Sync form state when data loads
  useEffect(() => {
    if (!heroStats.isLoading) setStatsForm(heroStats.data.stats);
  }, [heroStats.isLoading, heroStats.data.stats]);

  useEffect(() => {
    if (!contactInfo.isLoading) setContactForm(contactInfo.data);
  }, [contactInfo.isLoading, contactInfo.data]);

  useEffect(() => {
    if (!faqContent.isLoading) setFaqForm(faqContent.data.faqs);
  }, [faqContent.isLoading, faqContent.data.faqs]);

  const handleSaveStats = async () => {
    try {
      await heroStats.updateAsync({ stats: statsForm });
      toast({ title: "Stats updated successfully" });
    } catch {
      toast({ title: "Failed to update stats", variant: "destructive" });
    }
  };

  const handleSaveContact = async () => {
    try {
      await contactInfo.updateAsync(contactForm);
      toast({ title: "Contact info updated successfully" });
    } catch {
      toast({ title: "Failed to update contact info", variant: "destructive" });
    }
  };

  const handleSaveFAQ = async () => {
    try {
      await faqContent.updateAsync({ faqs: faqForm });
      toast({ title: "FAQ updated successfully" });
    } catch {
      toast({ title: "Failed to update FAQ", variant: "destructive" });
    }
  };

  const updateStat = (index: number, field: "value" | "label", value: string) => {
    const updated = [...statsForm];
    updated[index] = { ...updated[index], [field]: value };
    setStatsForm(updated);
  };

  const addFAQ = () => {
    setFaqForm([...faqForm, { question: "", answer: "" }]);
  };

  const removeFAQ = (index: number) => {
    setFaqForm(faqForm.filter((_, i) => i !== index));
  };

  const updateFAQ = (index: number, field: "question" | "answer", value: string) => {
    const updated = [...faqForm];
    updated[index] = { ...updated[index], [field]: value };
    setFaqForm(updated);
  };

  const isLoading = heroStats.isLoading || contactInfo.isLoading || faqContent.isLoading;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div>
        <h1 className="text-3xl font-bold">Site Content</h1>
        <p className="text-muted-foreground">Manage homepage content and settings</p>
      </div>

      <Tabs defaultValue="stats">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Hero Stats
          </TabsTrigger>
          <TabsTrigger value="contact" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Contact Info
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
          {isLoading ? (
            <ContentSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Hero Statistics</CardTitle>
                <CardDescription>Edit the statistics shown on the homepage hero section.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {statsForm.map((stat, index) => (
                  <div key={index} className="grid grid-cols-2 gap-4 p-4 rounded-lg border transition-colors hover:border-primary/20">
                    <div className="space-y-2">
                      <Label>Value</Label>
                      <Input
                        value={stat.value}
                        onChange={(e) => updateStat(index, "value", e.target.value)}
                        placeholder="e.g., 195+"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Label</Label>
                      <Input
                        value={stat.label}
                        onChange={(e) => updateStat(index, "label", e.target.value)}
                        placeholder="e.g., Countries"
                      />
                    </div>
                  </div>
                ))}
                <Button onClick={handleSaveStats} disabled={heroStats.isUpdating}>
                  {heroStats.isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Stats
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contact" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
          {isLoading ? (
            <ContentSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>Edit the contact details shown on the contact page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 p-4 rounded-lg border transition-colors hover:border-primary/20">
                  <h4 className="font-medium">Email</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email Address</Label>
                      <Input
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={contactForm.emailDescription}
                        onChange={(e) => setContactForm({ ...contactForm, emailDescription: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-4 rounded-lg border transition-colors hover:border-primary/20">
                  <h4 className="font-medium">Phone</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        value={contactForm.phoneDescription}
                        onChange={(e) => setContactForm({ ...contactForm, phoneDescription: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-4 rounded-lg border transition-colors hover:border-primary/20">
                  <h4 className="font-medium">Address</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Street Address</Label>
                      <Input
                        value={contactForm.address}
                        onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City, State, ZIP</Label>
                      <Input
                        value={contactForm.addressDescription}
                        onChange={(e) => setContactForm({ ...contactForm, addressDescription: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveContact} disabled={contactInfo.isUpdating}>
                  {contactInfo.isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Contact Info
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="faq" className="animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
          {isLoading ? (
            <ContentSkeleton />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>FAQ Content</CardTitle>
                <CardDescription>Manage the frequently asked questions shown on the contact page.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqForm.map((faq, index) => (
                  <div key={index} className="p-4 rounded-lg border space-y-4 transition-colors hover:border-primary/20">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <Label>Question</Label>
                          <Input
                            value={faq.question}
                            onChange={(e) => updateFAQ(index, "question", e.target.value)}
                            placeholder="Enter the question"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Answer</Label>
                          <Textarea
                            value={faq.answer}
                            onChange={(e) => updateFAQ(index, "answer", e.target.value)}
                            placeholder="Enter the answer"
                            rows={2}
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFAQ(index)}
                        className="ml-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-4">
                  <Button variant="outline" onClick={addFAQ}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add FAQ
                  </Button>
                  <Button onClick={handleSaveFAQ} disabled={faqContent.isUpdating}>
                    {faqContent.isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save FAQ
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
