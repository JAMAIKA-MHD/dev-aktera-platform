import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  HourlyDistributionItem,
  DailyDistributionItem,
  CarrierDistributionItem,
  OSDistribution,
  PrizeBurnRateItem,
} from "../../hooks/useAnalytics";

interface PercentageCircleProps {
  percentage: number;
  title: string;
  subtitle: string;
  color: string;
  badgeText?: string;
  icon?: React.ReactNode;
}

/**
 * Clean SVG Percentage Circle / Donut Ring Graphic
 */
export const PercentageCircle: React.FC<PercentageCircleProps> = ({
  percentage,
  title,
  subtitle,
  color,
  badgeText,
  icon,
}) => {
  const safeValue =
    typeof percentage === "number" && !isNaN(percentage) ? percentage : 0;
  const normalizedPct = Math.min(Math.max(safeValue, 0), 100);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (normalizedPct / 100) * circumference;

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-[24px] p-5 flex flex-col justify-between hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest">
          {title}
        </span>
        {icon}
      </div>

      <div className="flex items-center gap-5 my-2">
        <div className="relative flex items-center justify-center w-24 h-24 flex-shrink-0">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="stroke-slate-100"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Animated Progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              stroke={color}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-lg font-extrabold text-slate-900 leading-none">
              {normalizedPct.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="space-y-1">
          {badgeText && (
            <span
              className="inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider mb-1"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {badgeText}
            </span>
          )}
          <p className="text-xs font-semibold text-slate-700 leading-snug">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
};

interface ParticipationHistogramProps {
  dailyData: DailyDistributionItem[];
  hourlyData: HourlyDistributionItem[];
}

/**
 * Recharts Histogram (Bar Chart) for Daily and Hourly Activity
 */
export const ParticipationHistogram: React.FC<ParticipationHistogramProps> = ({
  dailyData,
  hourlyData,
}) => {
  const [viewMode, setViewMode] = React.useState<"daily" | "hourly">("daily");

  const chartData =
    viewMode === "daily"
      ? dailyData
      : hourlyData.map((h) => ({
          date: h.hour,
          entries: h.count,
          winners: h.winners,
        }));

  const hasData = chartData.some((d) => d.entries > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-sm text-slate-900">
            Participation Histogram
          </h3>
          <p className="text-[11px] text-slate-500">
            {viewMode === "daily"
              ? "Real daily entries & winning activity timeline."
              : "Real Algerian 24-hour peak volume distribution."}
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs self-start sm:self-auto">
          <button
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === "daily"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Daily Trend
          </button>
          <button
            onClick={() => setViewMode("hourly")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === "hourly"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            24H Hourly
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl">
          No participant activity recorded for this timeline yet.
        </div>
      ) : (
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#E2E8F0"
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#64748B", fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F172A",
                  borderColor: "#1E293B",
                  borderRadius: "12px",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
                }}
                itemStyle={{ color: "#F8FAFC" }}
              />
              <Bar
                dataKey="entries"
                name="Total Entries"
                fill="#6366F1"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="winners"
                name="Winners"
                fill="#10B981"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

interface CarrierBreakdownChartProps {
  carrierData: CarrierDistributionItem[];
}

/**
 * Recharts Pie / Carrier Split Graphic for Mobile Operators
 */
export const CarrierBreakdownChart: React.FC<CarrierBreakdownChartProps> = ({
  carrierData,
}) => {
  const hasData = carrierData.some((c) => c.count > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-bold text-sm text-slate-900">
          Algerian Mobile Operator Footprint
        </h3>
        <p className="text-[11px] text-slate-500">
          Distribution computed from real participant phone prefixes (Mobilis
          06, Djezzy 07, Ooredoo 05).
        </p>
      </div>

      {!hasData ? (
        <div className="h-64 flex items-center justify-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl">
          No mobile phone entries recorded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                const activeCarriers = carrierData.filter((c) => c.count > 0);
                return (
                  <PieChart>
                    <Pie
                      data={activeCarriers}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="name"
                    >
                      {activeCarriers.map((entry) => (
                        <Cell
                          key={entry.code}
                          fill={entry.color}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "#1E293B",
                        borderRadius: "12px",
                        color: "#FFFFFF",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                );
              })()}
            </ResponsiveContainer>
          </div>

          <div className="space-y-3">
            {carrierData.map((carrier) => (
              <div key={carrier.code} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: carrier.color }}
                    />
                    {carrier.name}
                  </span>
                  <span className="text-slate-600 font-mono text-[11px]">
                    {carrier.percentage}% ({carrier.count} users)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${carrier.percentage}%`,
                      backgroundColor: carrier.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface OSDistributionChartProps {
  osData: OSDistribution;
}

export const OSDistributionChart: React.FC<OSDistributionChartProps> = ({
  osData,
}) => {
  const total = osData.android + osData.ios + osData.desktop + osData.other;
  const items = [
    { label: "Android", count: osData.android, color: "#10B981", icon: "📱" },
    { label: "iOS (Apple)", count: osData.ios, color: "#6366F1", icon: "🍎" },
    {
      label: "Desktop / PC",
      count: osData.desktop,
      color: "#F59E0B",
      icon: "💻",
    },
    {
      label: "Other Devices",
      count: osData.other,
      color: "#64748B",
      icon: "🌐",
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <span>Operating System Split (OS Distribution)</span>
        </h3>
        <p className="text-[11px] text-slate-500">
          Critical for local campaign targeting and mobile optimization.
        </p>
      </div>

      <div className="space-y-3 pt-1">
        {items.map((item) => {
          const pct =
            total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0;
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                <span className="text-slate-600 font-mono text-[11px]">
                  {pct}% ({item.count} visitors)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface PrizeBurnRateListProps {
  prizes: PrizeBurnRateItem[];
}

export const PrizeBurnRateList: React.FC<PrizeBurnRateListProps> = ({
  prizes,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <span>Prize Burn Rate (Stock Exhaustion Speed)</span>
        </h3>
        <p className="text-[11px] text-slate-500">
          Real-time stock depletion tracker showing claimed vs remaining units
          per prize item.
        </p>
      </div>

      {prizes.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-slate-400 text-xs italic bg-slate-50/50 rounded-2xl">
          No active prizes allocated yet.
        </div>
      ) : (
        <div className="space-y-3.5 pt-1">
          {prizes.map((p) => (
            <div
              key={p.id}
              className="space-y-1.5 bg-slate-50/60 p-3.5 rounded-2xl border border-slate-200"
            >
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">{p.name}</span>
                <span className="text-slate-600 font-mono text-[11px] font-semibold">
                  {p.quantity_won} / {p.quantity} claimed (
                  {p.burn_rate_percentage}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    p.burn_rate_percentage >= 90
                      ? "bg-red-500"
                      : p.burn_rate_percentage >= 50
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                  style={{
                    width: `${Math.min(100, p.burn_rate_percentage)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
