/**
 * ============================================================================
 * OVERVIEW DASHBOARD HARDCODED / MOCK DATA STRUCTURES
 * ============================================================================
 *
 * Notice for Future Development & Supabase Integration:
 *
 * 1. KPI Submetrics (Clicks, Conversions, Growth Badges):
 *    - Currently hardcoded to match the provided high-fidelity template.
 *    - Future Source: Aggregated from `campaign_analytics`, `events`, or `lead_entries` tables.
 *    - Potential edge case: When a brand has 0 campaigns, numbers should gracefully fall back to 0.
 *
 * 2. Visitor Stats (Monthly Traffic & Peak Indicator):
 *    - Currently mock data for JAN through JUL with peak at MAY (+128 indicator).
 *    - Future Source: Web traffic integration / daily aggregated page views table (`daily_analytics`).
 *    - Potential edge case: Varying time horizons (e.g. 7 days vs 30 days vs 12 months).
 *
 * 3. Campaign Agenda Heatmap:
 *    - 7 days (Sun-Sat) x 8 time intervals (12 AM - 9 PM) activity matrix.
 *    - Intensity levels: 0 (light/inactive), 3- (moderate activity), 5+ (peak activity).
 *    - Future Source: Computed dynamically from active campaign schedules and entry timestamps.
 *    - Potential edge case: Timezone conversions (UTC vs local Algerian time WAT / CET).
 *
 * 4. Campaign Audience (Channel breakdown & Segmented Distribution):
 *    - Total Audience: 18,672 (+11% trend), segmented into comp 1 (green), comp 2 (light blue), comp 3 (dark blue).
 *    - Channels: Facebook link (12,458, +156.42%), Instagram link (4,128, -3.27%), Website link (2,086, +24.15%).
 *    - Future Source: UTM source tags (`utm_source=facebook`, `utm_source=instagram`, `utm_source=direct`) in `lead_entries`.
 *
 * 5. Campaign Insights (Summary block):
 *    - Date range (8 Oct - 8 Nov 2025), Audience (8,245), Total Clicks (14,892), Conversions (+1,847).
 *    - Future Source: Date-range filtered campaign query.
 * ============================================================================
 */

export interface KpiCardData {
  id: string;
  title: string;
  badge: {
    text: string;
    isPositive: boolean;
  };
  clicks: string;
  conversions: string;
  // Optional dynamic fallback mappings
  dynamicCount?: number;
}

export const OVERVIEW_KPI_CARDS: KpiCardData[] = [
  {
    id: "active-campaigns",
    title: "Active campaigns",
    badge: {
      text: "+ 34%",
      isPositive: true,
    },
    clicks: "428K",
    conversions: "52.8K",
  },
  {
    id: "leads-captured",
    title: "Leads Captured",
    badge: {
      text: "+ 18%",
      isPositive: true,
    },
    clicks: "892K",
    conversions: "4.7K",
  },
  {
    id: "handed-out",
    title: "Handed Out",
    badge: {
      text: "+ 47%",
      isPositive: true,
    },
    clicks: "156K",
    conversions: "38.2K",
  },
  {
    id: "avg-win-rate",
    title: "AVG. Win Rate",
    badge: {
      text: "+ 62%",
      isPositive: true,
    },
    clicks: "1.2M",
    conversions: "84.5K",
  },
];

export interface VisitorHistogramBar {
  id: string;
  campaignName: string;
  startDate: string;
  visitors: number;
  highlighted?: boolean;
}

export const VISITOR_HISTOGRAM_DATA: VisitorHistogramBar[] = [
  {
    id: "c1",
    campaignName: "Campaign Alpha",
    startDate: "12.03.2022",
    visitors: 1100,
  },
  {
    id: "c2",
    campaignName: "Campaign Beta",
    startDate: "05.04.2022",
    visitors: 1700,
  },
  {
    id: "c3",
    campaignName: "Campaign Gamma",
    startDate: "18.04.2022",
    visitors: 1600,
  },
  {
    id: "c4",
    campaignName: "Campaign Name",
    startDate: "19.07.2022",
    visitors: 1680,
    highlighted: true,
  },
  {
    id: "c5",
    campaignName: "Campaign Delta",
    startDate: "01.08.2022",
    visitors: 1520,
  },
  {
    id: "c6",
    campaignName: "Campaign Epsilon",
    startDate: "14.08.2022",
    visitors: 650,
  },
  {
    id: "c7",
    campaignName: "Campaign Zeta",
    startDate: "28.08.2022",
    visitors: 750,
  },
  {
    id: "c8",
    campaignName: "Campaign Eta",
    startDate: "10.09.2022",
    visitors: 950,
  },
  {
    id: "c9",
    campaignName: "Campaign Theta",
    startDate: "25.09.2022",
    visitors: 450,
  },
];

export interface VisitorStatPoint {
  month: string;
  currentPeriod: number; // in thousands (K)
  previousPeriod: number; // in thousands (K)
  isPeak?: boolean;
  peakLabel?: string;
}

export const VISITOR_STATS_DATA: VisitorStatPoint[] = [
  { month: "JAN", currentPeriod: 80, previousPeriod: 120 },
  { month: "FEB", currentPeriod: 40, previousPeriod: 135 },
  { month: "MAR", currentPeriod: 130, previousPeriod: 50 },
  { month: "APR", currentPeriod: 260, previousPeriod: 140 },
  {
    month: "MAY",
    currentPeriod: 320,
    previousPeriod: 220,
    isPeak: true,
    peakLabel: "+128",
  },
  { month: "JUN", currentPeriod: 220, previousPeriod: 270 },
  { month: "JUL", currentPeriod: 250, previousPeriod: 320 },
];

export type AgendaIntensity = 0 | 1 | 2; // 0 = empty/light (0), 1 = medium (3-), 2 = high (5+)

export interface AgendaTimeSlot {
  timeLabel: string;
  intensity: AgendaIntensity;
  campaignCount?: number;
}

export interface AvailableCampaignInfo {
  name: string;
  status: "active" | "paused" | "draft" | string;
  type?: string;
  timeWindow?: string;
}

export interface AgendaDaySchedule {
  day: "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";
  availableCampaigns?: AvailableCampaignInfo[];
  slots: AgendaTimeSlot[];
}

export const AGENDA_TIME_LABELS = [
  "12 AM",
  "3 AM",
  "6 AM",
  "9 AM",
  "12 PM",
  "3 PM",
  "6 PM",
  "9 PM",
];

// 7 rows x 8 columns matching the screenshot exactly:
export const CAMPAIGN_AGENDA_GRID: AgendaDaySchedule[] = [
  {
    day: "Sun",
    availableCampaigns: [
      {
        name: "Zid l'Heure Ramadan Wheel",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "6 AM - 12 PM",
      },
      {
        name: "Grand Yassir Express Challenge",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "3 PM - 6 PM",
      },
    ],
    slots: [
      { timeLabel: "12 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "6 AM", intensity: 2, campaignCount: 5 },
      { timeLabel: "9 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "12 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 PM", intensity: 2, campaignCount: 6 },
      { timeLabel: "6 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 PM", intensity: 0, campaignCount: 0 },
    ],
  },
  {
    day: "Mon",
    availableCampaigns: [
      {
        name: "Zid l'Heure Ramadan Wheel",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "9 AM - 6 PM",
      },
      {
        name: "S'hour Win & Refresh Quiz",
        status: "active",
        type: "Quiz",
        timeWindow: "12 PM - 3 PM",
      },
      {
        name: "Grand Yassir Express Challenge",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "6 PM - 9 PM",
      },
    ],
    slots: [
      { timeLabel: "12 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "6 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 AM", intensity: 2, campaignCount: 5 },
      { timeLabel: "12 PM", intensity: 1, campaignCount: 2 },
      { timeLabel: "3 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "6 PM", intensity: 2, campaignCount: 6 },
      { timeLabel: "9 PM", intensity: 0, campaignCount: 0 },
    ],
  },
  {
    day: "Tue",
    availableCampaigns: [
      {
        name: "Grand Yassir Express Challenge",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "3 AM - 6 AM",
      },
    ],
    slots: [
      { timeLabel: "12 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 AM", intensity: 1, campaignCount: 3 },
      { timeLabel: "6 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "12 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "6 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 PM", intensity: 0, campaignCount: 0 },
    ],
  },
  {
    day: "Wed",
    availableCampaigns: [
      {
        name: "Zid l'Heure Ramadan Wheel",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "6 AM - 12 PM",
      },
      {
        name: "Daily Healthy Smile Campaign",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "9 PM - 12 AM",
      },
    ],
    slots: [
      { timeLabel: "12 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "6 AM", intensity: 2, campaignCount: 7 },
      { timeLabel: "9 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "12 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "6 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 PM", intensity: 1, campaignCount: 2 },
    ],
  },
  {
    day: "Thu",
    availableCampaigns: [
      {
        name: "S'hour Win & Refresh Quiz",
        status: "active",
        type: "Quiz",
        timeWindow: "3 AM - 6 AM",
      },
      {
        name: "Grand Yassir Express Challenge",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "3 PM - 6 PM",
      },
    ],
    slots: [
      { timeLabel: "12 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 AM", intensity: 1, campaignCount: 2 },
      { timeLabel: "6 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "12 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 PM", intensity: 2, campaignCount: 5 },
      { timeLabel: "6 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 PM", intensity: 0, campaignCount: 0 },
    ],
  },
  {
    day: "Fri",
    availableCampaigns: [
      {
        name: "Grand Yassir Express Challenge",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "12 PM - 3 PM",
      },
    ],
    slots: [
      { timeLabel: "12 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "6 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "12 PM", intensity: 2, campaignCount: 6 },
      { timeLabel: "3 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "6 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 PM", intensity: 0, campaignCount: 0 },
    ],
  },
  {
    day: "Sat",
    availableCampaigns: [
      {
        name: "Zid l'Heure Ramadan Wheel",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "9 AM - 12 PM",
      },
      {
        name: "Daily Healthy Smile Campaign",
        status: "active",
        type: "Lucky Wheel",
        timeWindow: "3 PM - 6 PM",
      },
    ],
    slots: [
      { timeLabel: "12 AM", intensity: 1, campaignCount: 2 },
      { timeLabel: "3 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "6 AM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 AM", intensity: 2, campaignCount: 5 },
      { timeLabel: "12 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "3 PM", intensity: 2, campaignCount: 6 },
      { timeLabel: "6 PM", intensity: 0, campaignCount: 0 },
      { timeLabel: "9 PM", intensity: 0, campaignCount: 0 },
    ],
  },
];

export interface ChannelAudience {
  channelName: string;
  count: string;
  change: string;
  isPositive: boolean;
}

export const CAMPAIGN_AUDIENCE_DATA = {
  totalAudience: "18,672",
  growthBadge: "+ 11%",
  segments: [
    { name: "comp 1", color: "#22c55e", percentage: 50 },
    { name: "comp2", color: "#38bdf8", percentage: 28 },
    { name: "comp3", color: "#1d4ed8", percentage: 22 },
  ],
  channels: [
    {
      channelName: "facebook link",
      count: "12,458",
      change: "+ 156.42%",
      isPositive: true,
    },
    {
      channelName: "Instagram Link",
      count: "4,128",
      change: "- 3.27%",
      isPositive: false,
    },
    {
      channelName: "website Link",
      count: "2,086",
      change: "+ 24.15%",
      isPositive: true,
    },
  ] as ChannelAudience[],
};

export const CAMPAIGN_INSIGHTS_DATA = {
  dateRange: "From 8 Oct - 8 Nov 2025",
  audience: "8,245",
  totalClicks: "14,892",
  conversions: "+1,847",
};
