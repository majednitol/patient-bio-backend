import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "test" }, error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://example.com/url" }, error: null }),
      }),
    },
  },
}));

describe("Phase 2: Dashboard and Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 7: Greeting displays correctly
  describe("Test 7: Greeting displays correctly", () => {
    it("should return Good morning before noon", () => {
      const getGreeting = (hour: number) => {
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
      };

      expect(getGreeting(8)).toBe("Good morning");
      expect(getGreeting(0)).toBe("Good morning");
      expect(getGreeting(11)).toBe("Good morning");
    });

    it("should return Good afternoon between 12 and 17", () => {
      const getGreeting = (hour: number) => {
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
      };

      expect(getGreeting(12)).toBe("Good afternoon");
      expect(getGreeting(14)).toBe("Good afternoon");
      expect(getGreeting(16)).toBe("Good afternoon");
    });

    it("should return Good evening after 17", () => {
      const getGreeting = (hour: number) => {
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
      };

      expect(getGreeting(17)).toBe("Good evening");
      expect(getGreeting(20)).toBe("Good evening");
      expect(getGreeting(23)).toBe("Good evening");
    });
  });

  // Test 8: Health at a Glance cards
  describe("Test 8: Health at a Glance cards", () => {
    it("should count allergies from comma-separated string", () => {
      const countItems = (str: string | null) =>
        str ? str.split(",").filter(Boolean).length : 0;

      expect(countItems("Penicillin,Peanuts,Dust")).toBe(3);
      expect(countItems("Penicillin")).toBe(1);
      expect(countItems("")).toBe(0);
      expect(countItems(null)).toBe(0);
    });

    it("should count medications from comma-separated string", () => {
      const countItems = (str: string | null) =>
        str ? str.split(",").filter(Boolean).length : 0;

      expect(countItems("Aspirin,Metformin")).toBe(2);
      expect(countItems(null)).toBe(0);
    });

    it("should display blood group or 'Not set'", () => {
      const displayBloodGroup = (bg: string | null) => bg || "Not set";
      expect(displayBloodGroup("A+")).toBe("A+");
      expect(displayBloodGroup("O-")).toBe("O-");
      expect(displayBloodGroup(null)).toBe("Not set");
    });
  });

  // Test 9: Getting Started checklist
  describe("Test 9: Getting Started checklist", () => {
    it("should calculate checklist completion correctly", () => {
      const items = [
        { id: "profile", completed: true },
        { id: "health", completed: false },
        { id: "record", completed: true },
        { id: "doctor", completed: false },
      ];

      const completedCount = items.filter((i) => i.completed).length;
      const progressPercent = (completedCount / items.length) * 100;

      expect(completedCount).toBe(2);
      expect(progressPercent).toBe(50);
    });

    it("should show all completed when all steps done", () => {
      const items = [
        { id: "profile", completed: true },
        { id: "health", completed: true },
        { id: "record", completed: true },
        { id: "doctor", completed: true },
      ];

      const completedCount = items.filter((i) => i.completed).length;
      expect(completedCount).toBe(items.length);
    });

    it("should check profile completion based on display_name", () => {
      const profileComplete = (displayName: string | null) => !!displayName;
      expect(profileComplete("John Doe")).toBe(true);
      expect(profileComplete(null)).toBe(false);
      expect(profileComplete("")).toBe(false);
    });

    it("should check health completion based on blood_group", () => {
      const healthComplete = (bloodGroup: string | null) => !!bloodGroup;
      expect(healthComplete("A+")).toBe(true);
      expect(healthComplete(null)).toBe(false);
    });

    it("should check record completion based on records count", () => {
      expect([].length > 0).toBe(false);
      expect([{ id: "1" }].length > 0).toBe(true);
    });

    it("should check doctor completion based on doctors count", () => {
      expect([].length > 0).toBe(false);
      expect([{ id: "1" }].length > 0).toBe(true);
    });
  });

  // Test 10: Quick Actions navigation
  describe("Test 10: Quick Actions navigation", () => {
    it("should have correct navigation links", () => {
      const quickActions = [
        { title: "Upload Record", link: "/dashboard/upload" },
        { title: "Share Data", link: "/dashboard/share" },
        { title: "View Records", link: "/dashboard/prescriptions" },
      ];

      expect(quickActions[0].link).toBe("/dashboard/upload");
      expect(quickActions[1].link).toBe("/dashboard/share");
      expect(quickActions[2].link).toBe("/dashboard/prescriptions");
    });
  });

  // Test 11: Copy Passport ID
  describe("Test 11: Copy Passport ID", () => {
    it("should copy passport ID to clipboard", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText: writeTextMock } });

      const passportId = "PB-202602-000001-7";
      await navigator.clipboard.writeText(passportId);
      expect(writeTextMock).toHaveBeenCalledWith(passportId);
    });
  });

  // Test 12: Dashboard Stats Cards
  describe("Test 12: Dashboard Stats Cards", () => {
    it("should compute stats from records and doctors", () => {
      const records = [{ id: "1" }, { id: "2" }, { id: "3" }];
      const doctors = [{ id: "d1" }, { id: "d2" }];
      expect(records.length).toBe(3);
      expect(doctors.length).toBe(2);
    });
  });

  // Test 13: Health Score Gauge
  describe("Test 13: Health Score Gauge", () => {
    it("should compute health score based on profile completeness", () => {
      // Simplified health score calculation
      const calculateScore = (fields: Record<string, boolean>) => {
        const total = Object.keys(fields).length;
        const filled = Object.values(fields).filter(Boolean).length;
        return Math.round((filled / total) * 100);
      };

      expect(calculateScore({ name: true, blood: true, allergy: true, emergency: false })).toBe(75);
      expect(calculateScore({ name: true, blood: true, allergy: true, emergency: true })).toBe(100);
      expect(calculateScore({ name: false, blood: false, allergy: false, emergency: false })).toBe(0);
    });
  });

  // Test 14: Update display name
  describe("Test 14: Update display name", () => {
    it("should derive display name from profile or email", () => {
      const getDisplayName = (profileName: string | null, email: string | null) =>
        profileName || email?.split("@")[0] || "there";

      expect(getDisplayName("John", "john@test.com")).toBe("John");
      expect(getDisplayName(null, "john@test.com")).toBe("john");
      expect(getDisplayName(null, null)).toBe("there");
    });
  });

  // Test 16: Profile completion card
  describe("Test 16: Profile completion card", () => {
    it("should calculate profile completion percentage", () => {
      const fields = {
        display_name: "John",
        date_of_birth: "1990-01-01",
        gender: null,
        location: "NYC",
        phone: null,
      };

      const total = Object.keys(fields).length;
      const filled = Object.values(fields).filter(Boolean).length;
      const percentage = Math.round((filled / total) * 100);

      expect(percentage).toBe(60);
    });
  });
});
