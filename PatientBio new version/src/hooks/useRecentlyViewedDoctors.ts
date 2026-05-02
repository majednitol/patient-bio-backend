import { useState, useCallback } from "react";

const STORAGE_KEY = "recently-viewed-doctors";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewedDoctors() {
  const [recentIds, setRecentIds] = useState<string[]>(loadRecent);

  const addViewed = useCallback((doctorId: string) => {
    setRecentIds((prev) => {
      const filtered = prev.filter((id) => id !== doctorId);
      const next = [doctorId, ...filtered].slice(0, MAX_RECENT);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeViewed = useCallback((doctorId: string) => {
    setRecentIds((prev) => {
      const next = prev.filter((id) => id !== doctorId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { recentIds, addViewed, removeViewed };
}
