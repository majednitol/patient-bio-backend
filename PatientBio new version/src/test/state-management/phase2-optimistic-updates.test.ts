import { describe, it, expect } from "vitest";
import { QueryCache, OptimisticMutation, createMockNotification, type MockNotification } from "./state-helpers";

describe("Phase 2: Optimistic Updates", () => {
  const setupNotifications = () => {
    const cache = new QueryCache();
    const n1 = createMockNotification({ id: "n1", is_read: false, title: "Alert 1" });
    const n2 = createMockNotification({ id: "n2", is_read: false, title: "Alert 2" });
    const n3 = createMockNotification({ id: "n3", is_read: true, title: "Alert 3" });
    const key = ["notifications", "user-1"] as string[];
    cache.set(key, [n1, n2, n3]);
    return { cache, key, n1, n2, n3 };
  };

  it("1 - snapshot captures current cache state before mutation", () => {
    const { cache, key } = setupNotifications();
    const mutation = new OptimisticMutation<MockNotification[]>(cache, key);
    const snap = mutation.takeSnapshot();
    expect(snap).toHaveLength(3);
    expect(snap![0].id).toBe("n1");
  });

  it("2 - optimistic apply immediately updates cache", () => {
    const { cache, key, n1 } = setupNotifications();
    const mutation = new OptimisticMutation<MockNotification[]>(cache, key);
    mutation.takeSnapshot();
    cache.update<MockNotification[]>(key, (old) =>
      old.map((n) => (n.id === "n1" ? { ...n, is_read: true } : n))
    );
    const updated = cache.get<MockNotification[]>(key)!;
    expect(updated.find((n) => n.id === "n1")!.is_read).toBe(true);
  });

  it("3 - rollback restores exact previous state on error", () => {
    const { cache, key } = setupNotifications();
    const mutation = new OptimisticMutation<MockNotification[]>(cache, key);
    mutation.takeSnapshot();
    cache.update<MockNotification[]>(key, (old) => old.map((n) => ({ ...n, is_read: true })));
    mutation.rollback();
    const restored = cache.get<MockNotification[]>(key)!;
    expect(restored[0].is_read).toBe(false);
  });

  it("4 - commit finalizes optimistic data (no rollback possible)", () => {
    const { cache, key } = setupNotifications();
    const mutation = new OptimisticMutation<MockNotification[]>(cache, key);
    mutation.takeSnapshot();
    cache.update<MockNotification[]>(key, (old) => old.map((n) => ({ ...n, is_read: true })));
    mutation.commit();
    mutation.rollback(); // should be no-op
    const data = cache.get<MockNotification[]>(key)!;
    expect(data.every((n) => n.is_read)).toBe(true);
  });

  it("5 - mark single notification as read -- optimistic", () => {
    const { cache, key } = setupNotifications();
    cache.update<MockNotification[]>(key, (old) =>
      old.map((n) => (n.id === "n1" ? { ...n, is_read: true } : n))
    );
    const result = cache.get<MockNotification[]>(key)!;
    expect(result[0].is_read).toBe(true);
    expect(result[1].is_read).toBe(false);
  });

  it("6 - mark all notifications as read -- optimistic", () => {
    const { cache, key } = setupNotifications();
    cache.update<MockNotification[]>(key, (old) => old.map((n) => ({ ...n, is_read: true })));
    const result = cache.get<MockNotification[]>(key)!;
    expect(result.every((n) => n.is_read)).toBe(true);
  });

  it("7 - delete notification -- optimistic removal from list", () => {
    const { cache, key } = setupNotifications();
    cache.update<MockNotification[]>(key, (old) => old.filter((n) => n.id !== "n2"));
    const result = cache.get<MockNotification[]>(key)!;
    expect(result).toHaveLength(2);
    expect(result.find((n) => n.id === "n2")).toBeUndefined();
  });

  it("8 - rollback after failed markAsRead restores unread state", () => {
    const { cache, key } = setupNotifications();
    const mutation = new OptimisticMutation<MockNotification[]>(cache, key);
    mutation.takeSnapshot();
    cache.update<MockNotification[]>(key, (old) =>
      old.map((n) => (n.id === "n1" ? { ...n, is_read: true } : n))
    );
    // Simulate error
    mutation.rollback();
    expect(cache.get<MockNotification[]>(key)![0].is_read).toBe(false);
  });

  it("9 - rollback after failed delete restores deleted item", () => {
    const { cache, key } = setupNotifications();
    const mutation = new OptimisticMutation<MockNotification[]>(cache, key);
    mutation.takeSnapshot();
    cache.update<MockNotification[]>(key, (old) => old.filter((n) => n.id !== "n2"));
    expect(cache.get<MockNotification[]>(key)!).toHaveLength(2);
    mutation.rollback();
    expect(cache.get<MockNotification[]>(key)!).toHaveLength(3);
  });

  it("10 - cancel in-flight queries before optimistic update", () => {
    const { cache, key } = setupNotifications();
    const mutation = new OptimisticMutation<MockNotification[]>(cache, key);
    mutation.cancelQueries();
    expect(mutation.wasCancelled()).toBe(true);
    mutation.takeSnapshot();
    cache.update<MockNotification[]>(key, (old) => old.map((n) => ({ ...n, is_read: true })));
    const result = cache.get<MockNotification[]>(key)!;
    expect(result.every((n) => n.is_read)).toBe(true);
  });

  it("11 - multiple sequential optimistic updates accumulate", () => {
    const { cache, key } = setupNotifications();
    // First: mark n1 as read
    cache.update<MockNotification[]>(key, (old) =>
      old.map((n) => (n.id === "n1" ? { ...n, is_read: true } : n))
    );
    // Second: delete n3
    cache.update<MockNotification[]>(key, (old) => old.filter((n) => n.id !== "n3"));
    const result = cache.get<MockNotification[]>(key)!;
    expect(result).toHaveLength(2);
    expect(result[0].is_read).toBe(true);
  });

  it("12 - partial rollback leaves other data intact", () => {
    const cache = new QueryCache();
    const notifKey = ["notifications", "user-1"];
    const settingsKey = ["doctor-settings", "user-1"];
    cache.set(notifKey, [createMockNotification({ id: "n1" })]);
    cache.set(settingsKey, { timezone: "UTC" });

    const mutation = new OptimisticMutation<MockNotification[]>(cache, notifKey);
    mutation.takeSnapshot();
    cache.update<MockNotification[]>(notifKey, () => []);
    mutation.rollback();

    expect(cache.get<MockNotification[]>(notifKey)!).toHaveLength(1);
    expect(cache.get(settingsKey)).toEqual({ timezone: "UTC" });
  });

  it("13 - optimistic update with empty initial cache uses default", () => {
    const cache = new QueryCache();
    const key = ["notifications", "new-user"];
    cache.set(key, [] as MockNotification[]);
    const newNotif = createMockNotification({ id: "n-new" });
    cache.update<MockNotification[]>(key, (old) => [newNotif, ...old]);
    expect(cache.get<MockNotification[]>(key)!).toHaveLength(1);
  });

  it("14 - real-time INSERT prepends to cache (max 50)", () => {
    const cache = new QueryCache();
    const key = ["notifications", "user-1"];
    const existing = Array.from({ length: 50 }, (_, i) =>
      createMockNotification({ id: `n-${i}` })
    );
    cache.set(key, existing);

    const newNotif = createMockNotification({ id: "n-new" });
    cache.update<MockNotification[]>(key, (old) => [newNotif, ...old].slice(0, 50));

    const result = cache.get<MockNotification[]>(key)!;
    expect(result).toHaveLength(50);
    expect(result[0].id).toBe("n-new");
    expect(result[49].id).toBe("n-48"); // last old one got pushed out
  });

  it("15 - real-time UPDATE replaces matching item in cache", () => {
    const { cache, key } = setupNotifications();
    const updatedN1 = createMockNotification({ id: "n1", is_read: true, title: "Updated Alert" });
    cache.update<MockNotification[]>(key, (old) =>
      old.map((n) => (n.id === updatedN1.id ? updatedN1 : n))
    );
    const result = cache.get<MockNotification[]>(key)!;
    expect(result[0].title).toBe("Updated Alert");
    expect(result[0].is_read).toBe(true);
  });
});
