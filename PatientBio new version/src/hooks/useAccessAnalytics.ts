import { useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { subDays, subHours, isWithinInterval } from "date-fns";
import { toast } from "@/hooks/use-toast";

export interface AccessLog {
  id: string;
  user_id: string;
  access_token_id: string | null;
  accessor_id: string | null;
  accessor_type: string;
  accessor_name: string | null;
  accessor_email: string | null;
  access_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  country: string | null;
  city: string | null;
  accessed_at: string;
  created_at: string;
}

export interface AccessAnalytics {
  totalAccesses: number;
  uniqueAccessors: number;
  accessesByDay: { date: string; count: number }[];
  accessesByAccessor: { name: string; count: number; type: string }[];
  accessesByLocation: { location: string; count: number }[];
  recentLogs: AccessLog[];
}

export interface SuspiciousActivity {
  type: "new_location" | "high_frequency" | "unusual_hours";
  message: string;
  severity: "warning" | "alert";
  logs: AccessLog[];
}

export type DateRange = "7" | "30" | "90" | "custom";

interface UseAccessAnalyticsOptions {
  dateRange?: DateRange;
  customStartDate?: Date;
  customEndDate?: Date;
  searchQuery?: string;
  limit?: number;
}

const PAGE_SIZE = 50;

export const useAccessAnalytics = (options: UseAccessAnalyticsOptions = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [displayLimit, setDisplayLimit] = useState(options.limit || 20);

  const {
    dateRange = "7",
    customStartDate,
    customEndDate,
    searchQuery = "",
  } = options;

  // Calculate date range
  const getDateRange = () => {
    const now = new Date();
    if (dateRange === "custom" && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    const days = parseInt(dateRange) || 7;
    return { start: subDays(now, days), end: now };
  };

  const { start: startDate, end: endDate } = getDateRange();

  // Fetch access logs with server-side pagination
  const {
    data: paginatedData,
    isLoading: logsLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["access-logs", user?.id, dateRange, customStartDate?.toISOString(), customEndDate?.toISOString()],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user?.id) return { data: [] as AccessLog[], nextPage: null };

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from("access_logs")
        .select("id, user_id, access_token_id, accessor_id, accessor_type, accessor_name, accessor_email, access_reason, ip_address, user_agent, country, city, accessed_at, created_at")
        .eq("user_id", user.id)
        .gte("accessed_at", startDate.toISOString())
        .lte("accessed_at", endDate.toISOString())
        .order("accessed_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      const logs = data as AccessLog[];
      return {
        data: logs,
        nextPage: logs.length === PAGE_SIZE ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: !!user?.id,
  });

  // Flatten paginated data
  const accessLogs = useMemo(
    () => paginatedData?.pages.flatMap((page) => page.data) || [],
    [paginatedData]
  );

  // Fetch access tokens for backward compatibility
  const { data: tokens, isLoading: tokensLoading } = useQuery({
    queryKey: ["access-tokens-analytics", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("access_tokens")
        .select("id, user_id, token, expires_at, created_at, accessed_at, access_count, is_revoked, label, shared_scopes")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("access-logs-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "access_logs",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["access-logs", user.id] });
          toast.info("New access detected!", {
            description: "Someone just accessed your shared data.",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!accessLogs || !searchQuery.trim()) return accessLogs || [];

    const query = searchQuery.toLowerCase();
    return accessLogs.filter((log) => {
      const searchableText = [
        log.accessor_name,
        log.accessor_email,
        log.access_reason,
        log.city,
        log.country,
        log.accessor_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchableText.includes(query);
    });
  }, [accessLogs, searchQuery]);

  // Detect suspicious activity
  const suspiciousActivities = useMemo((): SuspiciousActivity[] => {
    if (!accessLogs || accessLogs.length === 0) return [];

    const activities: SuspiciousActivity[] = [];
    const now = new Date();
    const last24Hours = subHours(now, 24);
    const lastHour = subHours(now, 1);

    // Get unique locations from older logs (baseline)
    const oldLogs = accessLogs.filter(
      (l) => !isWithinInterval(new Date(l.accessed_at), { start: last24Hours, end: now })
    );
    const knownLocations = new Set(
      oldLogs.map((l) => [l.city, l.country].filter(Boolean).join(", ")).filter(Boolean)
    );

    // Check for new locations in last 24 hours
    const recentLogs = accessLogs.filter((l) =>
      isWithinInterval(new Date(l.accessed_at), { start: last24Hours, end: now })
    );

    const newLocationLogs = recentLogs.filter((l) => {
      const loc = [l.city, l.country].filter(Boolean).join(", ");
      return loc && !knownLocations.has(loc);
    });

    if (newLocationLogs.length >= 2) {
      const locations = [...new Set(newLocationLogs.map((l) => l.city || l.country))];
      activities.push({
        type: "new_location",
        message: `${newLocationLogs.length} accesses from new location${locations.length > 1 ? "s" : ""}: ${locations.slice(0, 2).join(", ")}`,
        severity: "warning",
        logs: newLocationLogs,
      });
    }

    // Check for high frequency (10+ in 1 hour)
    const lastHourLogs = accessLogs.filter((l) =>
      isWithinInterval(new Date(l.accessed_at), { start: lastHour, end: now })
    );

    if (lastHourLogs.length >= 10) {
      activities.push({
        type: "high_frequency",
        message: `${lastHourLogs.length} accesses in the last hour - unusually high activity`,
        severity: "alert",
        logs: lastHourLogs,
      });
    }

    // Check for unusual hours (12am-6am local time)
    const unusualHourLogs = recentLogs.filter((l) => {
      const hour = new Date(l.accessed_at).getHours();
      return hour >= 0 && hour < 6;
    });

    if (unusualHourLogs.length >= 3) {
      activities.push({
        type: "unusual_hours",
        message: `${unusualHourLogs.length} accesses during unusual hours (12am-6am)`,
        severity: "warning",
        logs: unusualHourLogs,
      });
    }

    return activities;
  }, [accessLogs]);

  // Calculate analytics from filtered logs
  const analytics: AccessAnalytics = useMemo(() => {
    const logs = filteredLogs || [];

    // Total accesses
    const totalAccesses = logs.length;

    // Unique accessors
    const uniqueAccessors = new Set(
      logs
        .filter((l) => l.accessor_id || l.accessor_email)
        .map((l) => l.accessor_id || l.accessor_email)
    ).size;

    // Accesses by day
    const dayMap = new Map<string, number>();
    logs.forEach((l) => {
      const date = new Date(l.accessed_at).toISOString().split("T")[0];
      dayMap.set(date, (dayMap.get(date) || 0) + 1);
    });

    const accessesByDay = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Accesses by accessor
    const accessorMap = new Map<string, { count: number; type: string }>();
    logs.forEach((l) => {
      const name = l.accessor_name || l.accessor_email || "Anonymous";
      const existing = accessorMap.get(name);
      if (existing) {
        existing.count++;
      } else {
        accessorMap.set(name, { count: 1, type: l.accessor_type });
      }
    });

    const accessesByAccessor = Array.from(accessorMap.entries())
      .map(([name, data]) => ({ name, count: data.count, type: data.type }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Accesses by location
    const locationMap = new Map<string, number>();
    logs
      .filter((l) => l.country || l.city)
      .forEach((l) => {
        const location = [l.city, l.country].filter(Boolean).join(", ") || "Unknown";
        locationMap.set(location, (locationMap.get(location) || 0) + 1);
      });

    const accessesByLocation = Array.from(locationMap.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAccesses,
      uniqueAccessors,
      accessesByDay,
      accessesByAccessor,
      accessesByLocation,
      recentLogs: logs.slice(0, displayLimit),
    };
  }, [filteredLogs, displayLimit]);

  // Calculate from tokens if no access logs yet (backward compatibility)
  const tokenAnalytics = useMemo(() => {
    const tokenData = tokens || [];
    const totalViews = tokenData.reduce((sum, t) => sum + (t.access_count || 0), 0);
    const viewedTokens = tokenData.filter((t) => t.access_count > 0);

    return {
      totalViews,
      activeLinks: tokenData.filter(
        (t) => !t.is_revoked && new Date(t.expires_at) > new Date()
      ).length,
      linksViewed: viewedTokens.length,
      recentlyAccessed: tokenData
        .filter((t) => t.accessed_at)
        .sort(
          (a, b) =>
            new Date(b.accessed_at!).getTime() - new Date(a.accessed_at!).getTime()
        )
        .slice(0, 5),
    };
  }, [tokens]);

  // Export to CSV
  const exportToCSV = () => {
    const logs = filteredLogs || [];
    if (logs.length === 0) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Date", "Time", "Accessor", "Type", "Reason", "Location", "IP"];
    const rows = logs.map((log) => [
      new Date(log.accessed_at).toLocaleDateString(),
      new Date(log.accessed_at).toLocaleTimeString(),
      log.accessor_name || log.accessor_email || "Anonymous",
      log.accessor_type,
      log.access_reason || "N/A",
      [log.city, log.country].filter(Boolean).join(", ") || "Unknown",
      log.ip_address ? "***" : "N/A",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `access-logs-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Access logs exported successfully");
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
    setDisplayLimit((prev) => prev + 20);
  };

  const hasMore = (filteredLogs?.length || 0) > displayLimit || !!hasNextPage;

  return {
    accessLogs: filteredLogs || [],
    analytics,
    tokenAnalytics,
    suspiciousActivities,
    isLoading: logsLoading || tokensLoading,
    hasAccessLogs: accessLogs.length > 0,
    exportToCSV,
    loadMore,
    hasMore,
    refetch,
  };
};
