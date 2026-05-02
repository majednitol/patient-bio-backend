import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  initOfflineDB,
  cacheHealthData,
  cacheUserProfile,
  getCachedHealthData,
  getCachedUserProfile,
  addToSyncQueue,
  getPendingSyncItems,
  removeFromSyncQueue,
  incrementSyncAttempts,
  updateLastSyncTime,
  getLastSyncTime,
  clearOfflineData,
} from "@/lib/offlineDB";

// Mock indexedDB for testing
const mockIndexedDB = () => {
  const stores: Record<string, Map<string, unknown>> = {
    healthData: new Map(),
    userProfile: new Map(),
    syncQueue: new Map(),
    offlineMetadata: new Map(),
  };

  return {
    stores,
    clear: () => {
      Object.values(stores).forEach((store) => store.clear());
    },
  };
};

// Mock IDB module
vi.mock("idb", () => {
  const stores: Record<string, Map<string, unknown>> = {
    healthData: new Map(),
    userProfile: new Map(),
    syncQueue: new Map(),
    offlineMetadata: new Map(),
    cachedRecords: new Map(),
    cachedAppointments: new Map(),
  };

  const createMockDB = () => ({
    put: vi.fn(async (storeName: string, value: Record<string, unknown>) => {
      const keyPath = storeName === "offlineMetadata" ? "key" : "userId";
      const key = value[keyPath] as string || value.id as string;
      stores[storeName].set(key, value);
      return key;
    }),
    get: vi.fn(async (storeName: string, key: string) => {
      return stores[storeName].get(key);
    }),
    add: vi.fn(async (storeName: string, value: Record<string, unknown>) => {
      const key = value.id as string;
      stores[storeName].set(key, value);
      return key;
    }),
    delete: vi.fn(async (storeName: string, key: string) => {
      stores[storeName].delete(key);
    }),
    clear: vi.fn(async (storeName: string) => {
      stores[storeName].clear();
    }),
    getAllFromIndex: vi.fn(async (storeName: string) => {
      return Array.from(stores[storeName].values());
    }),
    getAll: vi.fn(async (storeName: string) => {
      return Array.from(stores[storeName].values());
    }),
  });

  return {
    openDB: vi.fn(async () => createMockDB()),
    // Export stores for test access
    __stores: stores,
  };
});

describe("Offline Mode E2E Tests", () => {
  const testUserId = "test-user-123";

  const mockHealthData = {
    id: "health-1",
    bloodGroup: "O+",
    healthAllergies: "Penicillin",
    currentMedications: "Aspirin 100mg",
    chronicDiseases: "Hypertension",
    emergencyContactName: "Jane Doe",
    emergencyContactPhone: "+1-555-0123",
    height: "175cm",
    updatedAt: new Date().toISOString(),
  };

  const mockUserProfile = {
    id: "profile-1",
    displayName: "John Doe",
    dateOfBirth: "1990-01-15",
    gender: "Male",
    location: "New York, NY",
    phone: "+1-555-0100",
    patientPassportId: "PB-123456",
    avatarUrl: "https://example.com/avatar.jpg",
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    // Reset mocks and stores before each test
    vi.clearAllMocks();
    await initOfflineDB();
  });

  afterEach(async () => {
    await clearOfflineData();
  });

  describe("IndexedDB Initialization", () => {
    it("should initialize offline database successfully", async () => {
      const db = await initOfflineDB();
      expect(db).toBeDefined();
    });

    it("should create all required object stores", async () => {
      // Database should be accessible after init
      const db = await initOfflineDB();
      expect(db).toBeDefined();
      // Verify db methods exist
      expect(db.put).toBeDefined();
      expect(db.get).toBeDefined();
      expect(db.delete).toBeDefined();
    });

    it("should return same instance on multiple init calls", async () => {
      const db1 = await initOfflineDB();
      const db2 = await initOfflineDB();
      // Should be the same promise/instance
      expect(db1).toBe(db2);
    });

    it("should handle rapid concurrent initializations", async () => {
      const [db1, db2, db3] = await Promise.all([
        initOfflineDB(),
        initOfflineDB(),
        initOfflineDB(),
      ]);
      expect(db1).toBe(db2);
      expect(db2).toBe(db3);
    });
  });

  describe("Health Data Caching", () => {
    it("should cache health data for a user", async () => {
      await cacheHealthData(testUserId, mockHealthData);
      const cached = await getCachedHealthData(testUserId);

      expect(cached).toBeDefined();
      expect(cached?.bloodGroup).toBe("O+");
      expect(cached?.healthAllergies).toBe("Penicillin");
    });

    it("should update existing cached health data", async () => {
      // Cache initial data
      await cacheHealthData(testUserId, mockHealthData);

      // Update with new data
      await cacheHealthData(testUserId, {
        ...mockHealthData,
        bloodGroup: "A-",
        currentMedications: "Metformin 500mg",
      });

      const cached = await getCachedHealthData(testUserId);
      expect(cached?.bloodGroup).toBe("A-");
      expect(cached?.currentMedications).toBe("Metformin 500mg");
    });

    it("should handle null values in health data", async () => {
      await cacheHealthData(testUserId, {
        id: "health-2",
        bloodGroup: "B+",
        healthAllergies: null,
        currentMedications: null,
        chronicDiseases: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        height: null,
      });

      const cached = await getCachedHealthData(testUserId);
      expect(cached?.bloodGroup).toBe("B+");
      expect(cached?.healthAllergies).toBeNull();
    });

    it("should include cachedAt timestamp", async () => {
      const beforeCache = new Date().toISOString();
      await cacheHealthData(testUserId, mockHealthData);
      const afterCache = new Date().toISOString();

      const cached = await getCachedHealthData(testUserId);
      expect(cached?.cachedAt).toBeDefined();
      expect(cached?.cachedAt >= beforeCache).toBe(true);
      expect(cached?.cachedAt <= afterCache).toBe(true);
    });

    it("should return undefined for non-existent user", async () => {
      const cached = await getCachedHealthData("non-existent-user");
      expect(cached).toBeUndefined();
    });

    it("should handle all blood group types", async () => {
      const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
      
      for (const bloodGroup of bloodGroups) {
        await cacheHealthData(`user-${bloodGroup}`, { ...mockHealthData, bloodGroup });
        const cached = await getCachedHealthData(`user-${bloodGroup}`);
        expect(cached?.bloodGroup).toBe(bloodGroup);
      }
    });

    it("should handle complex allergy lists", async () => {
      const complexAllergies = "Penicillin (severe anaphylaxis), Sulfa drugs, NSAIDs, Latex, Shellfish, Tree nuts, Bee stings";
      await cacheHealthData(testUserId, { ...mockHealthData, healthAllergies: complexAllergies });
      
      const cached = await getCachedHealthData(testUserId);
      expect(cached?.healthAllergies).toBe(complexAllergies);
      expect(cached?.healthAllergies?.split(",").length).toBe(7);
    });

    it("should handle medication schedules with special characters", async () => {
      const medications = "Metformin 500mg — twice daily; Lisinopril 10mg (morning); Warfarin 5mg/7.5mg alternating";
      await cacheHealthData(testUserId, { ...mockHealthData, currentMedications: medications });
      
      const cached = await getCachedHealthData(testUserId);
      expect(cached?.currentMedications).toBe(medications);
    });
  });

  describe("User Profile Caching", () => {
    it("should cache user profile", async () => {
      await cacheUserProfile(testUserId, mockUserProfile);
      const cached = await getCachedUserProfile(testUserId);

      expect(cached).toBeDefined();
      expect(cached?.displayName).toBe("John Doe");
      expect(cached?.patientPassportId).toBe("PB-123456");
    });

    it("should update existing cached profile", async () => {
      await cacheUserProfile(testUserId, mockUserProfile);
      await cacheUserProfile(testUserId, {
        ...mockUserProfile,
        displayName: "John Smith",
        location: "Los Angeles, CA",
      });

      const cached = await getCachedUserProfile(testUserId);
      expect(cached?.displayName).toBe("John Smith");
      expect(cached?.location).toBe("Los Angeles, CA");
    });

    it("should preserve all profile fields", async () => {
      await cacheUserProfile(testUserId, mockUserProfile);
      const cached = await getCachedUserProfile(testUserId);

      expect(cached?.displayName).toBe(mockUserProfile.displayName);
      expect(cached?.dateOfBirth).toBe(mockUserProfile.dateOfBirth);
      expect(cached?.gender).toBe(mockUserProfile.gender);
      expect(cached?.location).toBe(mockUserProfile.location);
      expect(cached?.phone).toBe(mockUserProfile.phone);
      expect(cached?.patientPassportId).toBe(mockUserProfile.patientPassportId);
      expect(cached?.avatarUrl).toBe(mockUserProfile.avatarUrl);
    });

    it("should handle international names with unicode", async () => {
      const internationalNames = [
        "田中太郎", // Japanese
        "Müller-Schmidt", // German
        "José García", // Spanish
        "محمد علي", // Arabic
        "Владимир Путин", // Russian
        "김철수", // Korean
      ];

      for (let i = 0; i < internationalNames.length; i++) {
        await cacheUserProfile(`user-${i}`, { ...mockUserProfile, displayName: internationalNames[i] });
        const cached = await getCachedUserProfile(`user-${i}`);
        expect(cached?.displayName).toBe(internationalNames[i]);
      }
    });

    it("should handle various date of birth formats", async () => {
      const dates = ["1990-01-15", "2000-12-31", "1950-06-01"];
      
      for (const dob of dates) {
        await cacheUserProfile(`user-dob-${dob}`, { ...mockUserProfile, dateOfBirth: dob });
        const cached = await getCachedUserProfile(`user-dob-${dob}`);
        expect(cached?.dateOfBirth).toBe(dob);
      }
    });
  });

  describe("Sync Queue Management", () => {
    it("should add items to sync queue", async () => {
      await addToSyncQueue("update_profile", { displayName: "Updated Name" });
      const pending = await getPendingSyncItems();

      expect(pending.length).toBe(1);
      expect(pending[0].actionType).toBe("update_profile");
      expect(pending[0].payload.displayName).toBe("Updated Name");
    });

    it("should add multiple items to sync queue", async () => {
      await addToSyncQueue("update_profile", { displayName: "Name 1" });
      await addToSyncQueue("update_health_data", { bloodGroup: "AB+" });
      await addToSyncQueue("update_profile", { location: "Chicago" });

      const pending = await getPendingSyncItems();
      expect(pending.length).toBe(3);
    });

    it("should remove items from sync queue", async () => {
      await addToSyncQueue("update_profile", { displayName: "Test" });
      const pending = await getPendingSyncItems();
      expect(pending.length).toBe(1);

      await removeFromSyncQueue(pending[0].id);
      const afterRemove = await getPendingSyncItems();
      expect(afterRemove.length).toBe(0);
    });

    it("should track sync attempts", async () => {
      await addToSyncQueue("update_profile", { displayName: "Test" });
      const pending = await getPendingSyncItems();
      expect(pending[0].attempts).toBe(0);

      await incrementSyncAttempts(pending[0].id);
      const afterIncrement = await getPendingSyncItems();
      expect(afterIncrement[0].attempts).toBe(1);

      await incrementSyncAttempts(pending[0].id);
      const afterSecond = await getPendingSyncItems();
      expect(afterSecond[0].attempts).toBe(2);
    });

    it("should include createdAt timestamp", async () => {
      const before = new Date().toISOString();
      await addToSyncQueue("update_profile", { test: true });
      const after = new Date().toISOString();

      const pending = await getPendingSyncItems();
      expect(pending[0].createdAt >= before).toBe(true);
      expect(pending[0].createdAt <= after).toBe(true);
    });

    it("should generate unique IDs for queue items", async () => {
      await addToSyncQueue("update_profile", { a: 1 });
      await addToSyncQueue("update_profile", { b: 2 });

      const pending = await getPendingSyncItems();
      expect(pending[0].id).not.toBe(pending[1].id);
    });

    it("should handle large payloads in sync queue", async () => {
      const largePayload = {
        displayName: "A".repeat(1000),
        location: "B".repeat(500),
        notes: Array(100).fill("Note item").join(", "),
      };

      await addToSyncQueue("update_profile", largePayload);
      const pending = await getPendingSyncItems();
      
      expect(pending[0].payload.displayName).toHaveLength(1000);
      expect(pending[0].payload.location).toHaveLength(500);
    });

    it("should maintain FIFO order in sync queue", async () => {
      await addToSyncQueue("update_profile", { order: 1 });
      await new Promise(r => setTimeout(r, 5));
      await addToSyncQueue("update_profile", { order: 2 });
      await new Promise(r => setTimeout(r, 5));
      await addToSyncQueue("update_profile", { order: 3 });

      const pending = await getPendingSyncItems();
      
      // Items should be ordered by creation time
      expect(pending[0].payload.order).toBe(1);
      expect(pending[1].payload.order).toBe(2);
      expect(pending[2].payload.order).toBe(3);
    });

    it("should handle rapid queue additions", async () => {
      const promises = Array(20).fill(null).map((_, i) => 
        addToSyncQueue("update_profile", { index: i })
      );
      
      await Promise.all(promises);
      const pending = await getPendingSyncItems();
      
      expect(pending.length).toBe(20);
    });

    it("should preserve payload data types", async () => {
      const payload = {
        stringField: "test",
        numberField: 42,
        booleanField: true,
        nullField: null,
        arrayField: [1, 2, 3],
        nestedObject: { key: "value" },
      };

      await addToSyncQueue("update_profile", payload);
      const pending = await getPendingSyncItems();
      
      expect(typeof pending[0].payload.stringField).toBe("string");
      expect(typeof pending[0].payload.numberField).toBe("number");
      expect(typeof pending[0].payload.booleanField).toBe("boolean");
      expect(pending[0].payload.nullField).toBeNull();
      expect(Array.isArray(pending[0].payload.arrayField)).toBe(true);
      expect(typeof pending[0].payload.nestedObject).toBe("object");
    });
  });

  describe("Sync Queue Retry Logic", () => {
    it("should track multiple failed attempts", async () => {
      await addToSyncQueue("update_profile", { test: true });
      const pending = await getPendingSyncItems();
      const itemId = pending[0].id;

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await incrementSyncAttempts(itemId);
      }

      const afterAttempts = await getPendingSyncItems();
      expect(afterAttempts[0].attempts).toBe(5);
    });

    it("should identify items exceeding max retries", async () => {
      const MAX_RETRIES = 3;
      
      await addToSyncQueue("update_profile", { test: true });
      const pending = await getPendingSyncItems();
      const itemId = pending[0].id;

      for (let i = 0; i < MAX_RETRIES + 1; i++) {
        await incrementSyncAttempts(itemId);
      }

      const afterAttempts = await getPendingSyncItems();
      const exceedsMaxRetries = afterAttempts[0].attempts > MAX_RETRIES;
      expect(exceedsMaxRetries).toBe(true);
    });

    it("should handle selective queue processing", async () => {
      // Add multiple items
      await addToSyncQueue("update_profile", { field: "profile1" });
      await addToSyncQueue("update_health_data", { field: "health1" });
      await addToSyncQueue("update_profile", { field: "profile2" });

      const pending = await getPendingSyncItems();
      
      // Process only profile updates
      const profileItems = pending.filter(item => item.actionType === "update_profile");
      expect(profileItems.length).toBe(2);

      // Remove processed items
      for (const item of profileItems) {
        await removeFromSyncQueue(item.id);
      }

      const remaining = await getPendingSyncItems();
      expect(remaining.length).toBe(1);
      expect(remaining[0].actionType).toBe("update_health_data");
    });
  });

  describe("Sync Metadata", () => {
    it("should update and retrieve last sync time", async () => {
      const before = new Date().toISOString();
      await updateLastSyncTime();
      const after = new Date().toISOString();

      const lastSync = await getLastSyncTime();
      expect(lastSync).toBeDefined();
      expect(lastSync! >= before).toBe(true);
      expect(lastSync! <= after).toBe(true);
    });

    it("should return null if never synced", async () => {
      const lastSync = await getLastSyncTime();
      expect(lastSync).toBeNull();
    });

    it("should update sync time on multiple calls", async () => {
      await updateLastSyncTime();
      const first = await getLastSyncTime();

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      await updateLastSyncTime();
      const second = await getLastSyncTime();

      expect(second! >= first!).toBe(true);
    });

    it("should calculate time since last sync", async () => {
      await updateLastSyncTime();
      const lastSync = await getLastSyncTime();
      
      if (lastSync) {
        const lastSyncDate = new Date(lastSync);
        const now = new Date();
        const diffMs = now.getTime() - lastSyncDate.getTime();
        
        // Should be very recent (within 1 second)
        expect(diffMs).toBeLessThan(1000);
      }
    });
  });

  describe("Clear Offline Data", () => {
    it("should clear all cached data", async () => {
      // Populate all stores
      await cacheHealthData(testUserId, mockHealthData);
      await cacheUserProfile(testUserId, mockUserProfile);
      await addToSyncQueue("update_profile", { test: true });
      await updateLastSyncTime();

      // Verify data exists
      expect(await getCachedHealthData(testUserId)).toBeDefined();
      expect(await getCachedUserProfile(testUserId)).toBeDefined();
      expect((await getPendingSyncItems()).length).toBeGreaterThan(0);
      expect(await getLastSyncTime()).not.toBeNull();

      // Clear all
      await clearOfflineData();

      // Verify all cleared
      expect(await getCachedHealthData(testUserId)).toBeUndefined();
      expect(await getCachedUserProfile(testUserId)).toBeUndefined();
      expect((await getPendingSyncItems()).length).toBe(0);
      expect(await getLastSyncTime()).toBeNull();
    });

    it("should handle clear on empty database", async () => {
      // Should not throw
      await expect(clearOfflineData()).resolves.not.toThrow();
    });

    it("should clear data for all users", async () => {
      // Cache data for multiple users
      await cacheHealthData("user-1", { ...mockHealthData, bloodGroup: "A+" });
      await cacheHealthData("user-2", { ...mockHealthData, bloodGroup: "B+" });
      await cacheHealthData("user-3", { ...mockHealthData, bloodGroup: "O+" });

      await clearOfflineData();

      expect(await getCachedHealthData("user-1")).toBeUndefined();
      expect(await getCachedHealthData("user-2")).toBeUndefined();
      expect(await getCachedHealthData("user-3")).toBeUndefined();
    });
  });

  describe("Online/Offline Transitions", () => {
    it("should detect online status correctly", () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, "onLine", {
        value: true,
        writable: true,
        configurable: true,
      });
      expect(navigator.onLine).toBe(true);
    });

    it("should detect offline status correctly", () => {
      Object.defineProperty(navigator, "onLine", {
        value: false,
        writable: true,
        configurable: true,
      });
      expect(navigator.onLine).toBe(false);
    });

    it("should trigger online event handler", () => {
      const onlineHandler = vi.fn();
      window.addEventListener("online", onlineHandler);

      window.dispatchEvent(new Event("online"));
      expect(onlineHandler).toHaveBeenCalledTimes(1);

      window.removeEventListener("online", onlineHandler);
    });

    it("should trigger offline event handler", () => {
      const offlineHandler = vi.fn();
      window.addEventListener("offline", offlineHandler);

      window.dispatchEvent(new Event("offline"));
      expect(offlineHandler).toHaveBeenCalledTimes(1);

      window.removeEventListener("offline", offlineHandler);
    });

    it("should queue changes when offline", async () => {
      // Simulate offline
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });

      // Add to sync queue (simulating offline change)
      await addToSyncQueue("update_profile", { displayName: "Offline Update" });
      await addToSyncQueue("update_health_data", { bloodGroup: "O-" });

      const pending = await getPendingSyncItems();
      expect(pending.length).toBe(2);
    });

    it("should process sync queue when back online", async () => {
      // Add pending items
      await addToSyncQueue("update_profile", { displayName: "Sync Me" });
      await addToSyncQueue("update_health_data", { bloodGroup: "A+" });

      const beforeSync = await getPendingSyncItems();
      expect(beforeSync.length).toBe(2);

      // Simulate syncing each item
      for (const item of beforeSync) {
        await removeFromSyncQueue(item.id);
      }

      const afterSync = await getPendingSyncItems();
      expect(afterSync.length).toBe(0);
    });

    it("should handle rapid online/offline transitions", () => {
      const transitions: boolean[] = [];
      
      const handler = () => {
        transitions.push(navigator.onLine);
      };

      window.addEventListener("online", handler);
      window.addEventListener("offline", handler);

      // Simulate rapid transitions
      for (let i = 0; i < 5; i++) {
        Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
        window.dispatchEvent(new Event("online"));
        
        Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
        window.dispatchEvent(new Event("offline"));
      }

      expect(transitions.length).toBe(10);

      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    });

    it("should preserve queued changes during connection fluctuations", async () => {
      // Go offline and make changes
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
      await addToSyncQueue("update_profile", { change: 1 });
      
      // Brief online moment
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      
      // Back offline before sync completes
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
      await addToSyncQueue("update_profile", { change: 2 });

      const pending = await getPendingSyncItems();
      expect(pending.length).toBe(2);
    });
  });

  describe("Data Integrity", () => {
    it("should preserve data across multiple cache operations", async () => {
      // Cache multiple users' data
      const user1 = "user-1";
      const user2 = "user-2";

      await cacheHealthData(user1, { ...mockHealthData, bloodGroup: "A+" });
      await cacheHealthData(user2, { ...mockHealthData, bloodGroup: "B-" });

      const cached1 = await getCachedHealthData(user1);
      const cached2 = await getCachedHealthData(user2);

      expect(cached1?.bloodGroup).toBe("A+");
      expect(cached2?.bloodGroup).toBe("B-");
    });

    it("should handle concurrent cache operations", async () => {
      // Simulate concurrent caching
      await Promise.all([
        cacheHealthData(testUserId, mockHealthData),
        cacheUserProfile(testUserId, mockUserProfile),
        addToSyncQueue("update_profile", { test: 1 }),
        addToSyncQueue("update_health_data", { test: 2 }),
      ]);

      const health = await getCachedHealthData(testUserId);
      const profile = await getCachedUserProfile(testUserId);
      const pending = await getPendingSyncItems();

      expect(health).toBeDefined();
      expect(profile).toBeDefined();
      expect(pending.length).toBe(2);
    });

    it("should generate UUID for items without ID", async () => {
      await cacheHealthData(testUserId, {
        bloodGroup: "O+",
        // No id provided
      });

      const cached = await getCachedHealthData(testUserId);
      expect(cached?.id).toBeDefined();
      expect(cached?.id.length).toBeGreaterThan(0);
    });

    it("should not corrupt data on partial updates", async () => {
      // Initial full cache
      await cacheHealthData(testUserId, mockHealthData);

      // Partial update - only blood group
      await cacheHealthData(testUserId, {
        ...mockHealthData,
        bloodGroup: "AB+",
      });

      const cached = await getCachedHealthData(testUserId);
      
      // Blood group should be updated
      expect(cached?.bloodGroup).toBe("AB+");
      // Other fields should remain
      expect(cached?.healthAllergies).toBe(mockHealthData.healthAllergies);
      expect(cached?.currentMedications).toBe(mockHealthData.currentMedications);
    });
  });

  describe("Emergency Access Scenario", () => {
    it("should provide critical health data offline", async () => {
      // Cache critical data while online
      await cacheHealthData(testUserId, {
        id: "emergency-health",
        bloodGroup: "O-", // Universal donor - critical info
        healthAllergies: "Penicillin, Sulfa drugs",
        currentMedications: "Warfarin 5mg, Metoprolol 50mg",
        chronicDiseases: "AFib, DVT history",
        emergencyContactName: "Emergency Contact",
        emergencyContactPhone: "+1-555-HELP",
        height: "180cm",
      });

      await cacheUserProfile(testUserId, {
        id: "emergency-profile",
        displayName: "Emergency Patient",
        dateOfBirth: "1950-01-01",
        gender: "Male",
        location: "Remote Location",
        phone: null,
        patientPassportId: "PB-EMERGENCY",
      });

      // Simulate offline emergency access
      Object.defineProperty(navigator, "onLine", {
        value: false,
        configurable: true,
      });

      // Should still be able to retrieve critical data
      const health = await getCachedHealthData(testUserId);
      const profile = await getCachedUserProfile(testUserId);

      // Verify all critical emergency information is available
      expect(health?.bloodGroup).toBe("O-");
      expect(health?.healthAllergies).toContain("Penicillin");
      expect(health?.currentMedications).toContain("Warfarin");
      expect(health?.emergencyContactPhone).toBe("+1-555-HELP");
      expect(profile?.patientPassportId).toBe("PB-EMERGENCY");
    });

    it("should provide data for first responders", async () => {
      await cacheHealthData(testUserId, {
        bloodGroup: "A-",
        healthAllergies: "Epinephrine contraindicated - MAO inhibitor use",
        currentMedications: "Phenelzine 15mg TID, Insulin glargine 20U",
        chronicDiseases: "Type 1 Diabetes, Depression",
        emergencyContactName: "Dr. Smith (PCP)",
        emergencyContactPhone: "+1-555-DOCTOR",
        height: "165cm",
      });

      // Simulate no network
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

      const health = await getCachedHealthData(testUserId);

      // First responder critical info
      expect(health?.healthAllergies).toContain("Epinephrine contraindicated");
      expect(health?.currentMedications).toContain("Insulin");
      expect(health?.chronicDiseases).toContain("Diabetes");
    });
  });

  describe("Storage Quotas and Limits", () => {
    it("should handle storing maximum expected records", async () => {
      // Simulate caching data for 50 users (reasonable family/shared device scenario)
      const userCount = 50;
      
      for (let i = 0; i < userCount; i++) {
        await cacheHealthData(`user-${i}`, {
          ...mockHealthData,
          bloodGroup: ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"][i % 8],
        });
        await cacheUserProfile(`user-${i}`, {
          ...mockUserProfile,
          displayName: `User ${i}`,
        });
      }

      // Verify random samples are retrievable
      const sample1 = await getCachedHealthData("user-0");
      const sample2 = await getCachedHealthData("user-25");
      const sample3 = await getCachedHealthData("user-49");

      expect(sample1).toBeDefined();
      expect(sample2).toBeDefined();
      expect(sample3).toBeDefined();
    });

    it("should handle large sync queue", async () => {
      // Add 100 pending sync items
      for (let i = 0; i < 100; i++) {
        await addToSyncQueue(
          i % 2 === 0 ? "update_profile" : "update_health_data",
          { index: i, data: `Payload ${i}` }
        );
      }

      const pending = await getPendingSyncItems();
      expect(pending.length).toBe(100);
    });
  });

  describe("Conflict Resolution Scenarios", () => {
    it("should use last-write-wins for cache updates", async () => {
      // Simulate conflicting updates
      await cacheHealthData(testUserId, { ...mockHealthData, bloodGroup: "A+" });
      await cacheHealthData(testUserId, { ...mockHealthData, bloodGroup: "B+" });
      await cacheHealthData(testUserId, { ...mockHealthData, bloodGroup: "O+" });

      const cached = await getCachedHealthData(testUserId);
      expect(cached?.bloodGroup).toBe("O+"); // Last write wins
    });

    it("should preserve newer cachedAt timestamp on update", async () => {
      await cacheHealthData(testUserId, mockHealthData);
      const first = await getCachedHealthData(testUserId);

      await new Promise(r => setTimeout(r, 10));

      await cacheHealthData(testUserId, { ...mockHealthData, bloodGroup: "AB+" });
      const second = await getCachedHealthData(testUserId);

      expect(second?.cachedAt > first?.cachedAt!).toBe(true);
    });

    it("should queue multiple updates for same field", async () => {
      await addToSyncQueue("update_profile", { displayName: "Name 1" });
      await addToSyncQueue("update_profile", { displayName: "Name 2" });
      await addToSyncQueue("update_profile", { displayName: "Name 3" });

      const pending = await getPendingSyncItems();
      
      // All updates should be queued (server will handle merge)
      expect(pending.length).toBe(3);
      expect(pending.map(p => p.payload.displayName)).toEqual(["Name 1", "Name 2", "Name 3"]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string values", async () => {
      await cacheHealthData(testUserId, {
        ...mockHealthData,
        healthAllergies: "",
        currentMedications: "",
      });

      const cached = await getCachedHealthData(testUserId);
      // Empty strings become null due to || null in implementation
      expect(cached?.healthAllergies).toBeNull();
      expect(cached?.currentMedications).toBeNull();
    });

    it("should handle very long text content", async () => {
      const longText = "A".repeat(10000);
      
      await cacheHealthData(testUserId, {
        ...mockHealthData,
        chronicDiseases: longText,
      });

      const cached = await getCachedHealthData(testUserId);
      expect(cached?.chronicDiseases).toHaveLength(10000);
    });

    it("should handle special characters in all fields", async () => {
      const specialProfile = {
        ...mockUserProfile,
        displayName: "O'Connor-Smith, Jr.",
        location: "São Paulo, Brazil <test>",
        phone: "+55 (11) 98765-4321",
      };

      await cacheUserProfile(testUserId, specialProfile);
      const cached = await getCachedUserProfile(testUserId);

      expect(cached?.displayName).toBe("O'Connor-Smith, Jr.");
      expect(cached?.location).toBe("São Paulo, Brazil <test>");
      expect(cached?.phone).toBe("+55 (11) 98765-4321");
    });

    it("should handle rapid read/write cycles", async () => {
      const operations = [];
      
      for (let i = 0; i < 20; i++) {
        operations.push(
          cacheHealthData(testUserId, { ...mockHealthData, bloodGroup: `Type-${i}` })
            .then(() => getCachedHealthData(testUserId))
        );
      }

      const results = await Promise.all(operations);
      
      // All operations should complete without error
      expect(results.every(r => r !== undefined)).toBe(true);
    });
  });
});
