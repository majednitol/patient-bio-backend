import { useState } from "react";
import { Globe, Monitor, Smartphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useWebsiteAnalytics } from "@/hooks/useWebsiteAnalytics";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DATE_RANGES = [
  { label: "7d", days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;

const chartConfig = {
  visitors: { label: "Visitors", color: "hsl(var(--chart-4))" },
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const COUNTRY_FLAGS: Record<string, string> = {
  BD: "🇧🇩", US: "🇺🇸", GB: "🇬🇧", UK: "🇬🇧", IN: "🇮🇳", CA: "🇨🇦", AU: "🇦🇺",
  DE: "🇩🇪", FR: "🇫🇷", JP: "🇯🇵", CN: "🇨🇳", BR: "🇧🇷", KR: "🇰🇷", MX: "🇲🇽",
  RU: "🇷🇺", ES: "🇪🇸", IT: "🇮🇹", NL: "🇳🇱", SE: "🇸🇪", SG: "🇸🇬", AE: "🇦🇪",
  PK: "🇵🇰", NG: "🇳🇬", PH: "🇵🇭", ID: "🇮🇩", TH: "🇹🇭", VN: "🇻🇳", EG: "🇪🇬",
  ZA: "🇿🇦", SA: "🇸🇦", TR: "🇹🇷", PL: "🇵🇱", AR: "🇦🇷", CO: "🇨🇴", CL: "🇨🇱",
  MY: "🇲🇾", NZ: "🇳🇿", IE: "🇮🇪", PT: "🇵🇹", NO: "🇳🇴", DK: "🇩🇰", FI: "🇫🇮",
  CH: "🇨🇭", AT: "🇦🇹", BE: "🇧🇪", IL: "🇮🇱", HK: "🇭🇰", TW: "🇹🇼",
};

const COUNTRY_NAMES: Record<string, string> = {
  BD: "Bangladesh", US: "United States", GB: "United Kingdom", UK: "United Kingdom",
  IN: "India", CA: "Canada", AU: "Australia", DE: "Germany", FR: "France",
  JP: "Japan", CN: "China", BR: "Brazil", KR: "South Korea", MX: "Mexico",
  RU: "Russia", ES: "Spain", IT: "Italy", NL: "Netherlands", SE: "Sweden",
  SG: "Singapore", AE: "UAE", PK: "Pakistan", NG: "Nigeria", PH: "Philippines",
  ID: "Indonesia", TH: "Thailand", VN: "Vietnam", EG: "Egypt", ZA: "South Africa",
  SA: "Saudi Arabia", TR: "Turkey", PL: "Poland", AR: "Argentina", CO: "Colombia",
  CL: "Chile", MY: "Malaysia", NZ: "New Zealand", IE: "Ireland", PT: "Portugal",
  NO: "Norway", DK: "Denmark", FI: "Finland", CH: "Switzerland", AT: "Austria",
  BE: "Belgium", IL: "Israel", HK: "Hong Kong", TW: "Taiwan",
};

export function WebsiteTrafficCard() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useWebsiteAnalytics(days);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[260px] w-full" />
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const trendData = data.dailyTrend.map((d) => ({
    ...d,
    dateLabel: format(new Date(d.date + "T00:00:00"), "d MMM"),
  }));

  // Current visitors: count sessions from the last trend entry
  const currentVisitors = data.dailyTrend.length > 0 ? data.dailyTrend[data.dailyTrend.length - 1].visitors : 0;

  const totalDevices = data.devices.mobile.count + data.devices.desktop.count;
  const mobilePct = totalDevices > 0 ? ((data.devices.mobile.count / totalDevices) * 100).toFixed(1) : "0";
  const desktopPct = totalDevices > 0 ? ((data.devices.desktop.count / totalDevices) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      {/* Header with date range picker */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold leading-tight">Website Traffic</h2>
            <p className="text-xs text-muted-foreground">patientbio.lovable.app</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {DATE_RANGES.map((range) => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-colors",
                days === range.days
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current Visitors */}
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold">{currentVisitors}</span>
        <span className="text-sm text-muted-foreground">current visitors</span>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Summary Metrics Row */}
      <div>
        <p className="text-xs text-muted-foreground mb-3">Last {days} days</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 sm:gap-6">
          <SummaryMetric label="Visitors" value={String(data.summary.totalVisitors)} />
          <SummaryMetric label="Pageviews" value={String(data.summary.totalPageviews)} />
          <SummaryMetric label="Views Per Visit" value={data.summary.avgPagesPerVisitor.toFixed(2)} />
          <SummaryMetric label="Visit Duration" value={formatDuration(data.summary.avgSessionDuration)} />
          <SummaryMetric label="Bounce Rate" value={`${data.summary.bounceRate}%`} />
        </div>
      </div>

      {/* Main Chart */}
      <ChartContainer config={chartConfig} className="h-[200px] sm:h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="visitors" stroke="hsl(var(--chart-4))" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitors)" name="Visitors" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>

      {/* Breakdown Sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {/* Sources */}
        <BreakdownSection
          title="source"
          valueLabel="Visitors"
          items={data.sources.map((s) => ({ label: s.name, value: s.visitors }))}
        />

        {/* Pages */}
        <BreakdownSection
          title="page"
          valueLabel="Visitors"
          items={data.pages.slice(0, 10).map((p) => ({ label: p.path, value: p.visitors }))}
        />

        {/* Countries */}
        <BreakdownSection
          title="country"
          valueLabel="Visitors"
          items={data.countries.map((c) => ({
            label: `${COUNTRY_FLAGS[c.code] || "🏳️"}${COUNTRY_NAMES[c.code] || c.name || c.code}`,
            value: c.visitors,
          }))}
        />

        {/* Devices */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">device</h3>
            <span className="text-xs text-muted-foreground">Visitors</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                Mobile
              </span>
              <span className="text-sm font-medium tabular-nums">{mobilePct}%</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-sm flex items-center gap-2">
                <Monitor className="h-4 w-4 text-muted-foreground" />
                Desktop
              </span>
              <span className="text-sm font-medium tabular-nums">{desktopPct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-lg font-semibold leading-tight">{value}</p>
    </div>
  );
}

function BreakdownSection({
  title,
  valueLabel,
  items,
}: {
  title: string;
  valueLabel: string;
  items: { label: string; value: number }[];
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <span className="text-xs text-muted-foreground">{valueLabel}</span>
      </div>
      <div className="space-y-1">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground italic">No data yet</p>
        )}
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-1.5">
            <span className="text-sm truncate max-w-[75%]">{item.label}</span>
            <span className="text-sm font-medium tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
