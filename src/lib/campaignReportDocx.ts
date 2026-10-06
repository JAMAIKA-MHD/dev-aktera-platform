/**
 * Predefined template for the exported campaign analytics report (.docx).
 *
 * Builds a Word document from the `get_campaign_analytics_report` payload:
 * key metrics, every chart shown on the campaign dashboard (embedded as
 * images), their data tables, and the participant list on landscape pages.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  buildPrizeSeries,
  buildWilayaBreakdown,
  formatDayLabel,
  formatDuration,
  formatRate,
  OTHER_SERIES_COLOR,
  SERIES_COLORS_LIGHT,
  WEEKDAY_LABELS,
} from "./campaignAnalyticsTransforms";
import {
  barChartSvg,
  donutSvg,
  DonutItem,
  lineChartSvg,
  REPORT_HALF_CHART_WIDTH,
  stackedAreaSvg,
  StackSeries,
  SvgChart,
  wilayaMapSvg,
} from "./campaignReportCharts";
import { svgToPng } from "./svgToPng";
import { CampaignAnalyticsReport } from "../types";

const INK = "0F172A";
const MUTED = "64748B";
const RULE = "E2E8F0";
const HEADER_FILL = "F1F5F9";
const FONT = "Calibri";

// A4 in twips, with 0.7" margins.
const PAGE_WIDTH = 11906;
const PAGE_HEIGHT = 16838;
const PAGE_MARGIN = 1000;
const PORTRAIT_CONTENT = PAGE_WIDTH - PAGE_MARGIN * 2;
const LANDSCAPE_CONTENT = PAGE_HEIGHT - PAGE_MARGIN * 2;
// Widest image that fits the portrait text column, in pixels (96 dpi).
const MAX_IMAGE_WIDTH = 620;

const num = (value: number): string => value.toLocaleString("en-US");

const share = (count: number, total: number): string =>
  total > 0 ? `${((count / total) * 100).toFixed(1)}%` : "—";

type Align = "left" | "right";

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const RULE_BORDER = { style: BorderStyle.SINGLE, size: 4, color: RULE };

const text = (
  value: string,
  options: { bold?: boolean; size?: number; color?: string } = {},
): TextRun =>
  new TextRun({
    text: value,
    font: FONT,
    bold: options.bold,
    size: options.size ?? 20,
    color: options.color ?? INK,
  });

const sectionHeading = (title: string, subtitle: string): Paragraph[] => [
  new Paragraph({
    keepNext: true,
    spacing: { before: 360, after: 40 },
    children: [text(title, { bold: true, size: 28 })],
  }),
  new Paragraph({
    keepNext: true,
    spacing: { after: 160 },
    children: [text(subtitle, { size: 18, color: MUTED })],
  }),
];

const subHeading = (title: string): Paragraph =>
  new Paragraph({
    keepNext: true,
    spacing: { before: 200, after: 80 },
    children: [
      text(title.toUpperCase(), { bold: true, size: 16, color: MUTED }),
    ],
  });

const note = (value: string): Paragraph =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [text(value, { size: 18, color: MUTED })],
  });

async function chartImage(
  chart: SvgChart,
  displayWidth = Math.min(chart.width, MAX_IMAGE_WIDTH),
): Promise<Paragraph> {
  const data = await svgToPng(chart.svg, chart.width, chart.height);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new ImageRun({
        type: "png",
        data,
        transformation: {
          width: displayWidth,
          height: Math.round((displayWidth / chart.width) * chart.height),
        },
      }),
    ],
  });
}

interface Column {
  header: string;
  /** Relative width; columns share the table width proportionally. */
  weight: number;
  align?: Align;
}

function dataTable(
  columns: Column[],
  rows: string[][],
  tableWidth: number,
  fontSize = 18,
): Table {
  const totalWeight = columns.reduce((sum, column) => sum + column.weight, 0);
  const widths = columns.map((column) =>
    Math.floor((column.weight / totalWeight) * tableWidth),
  );
  const cell = (value: string, index: number, header: boolean): TableCell =>
    new TableCell({
      width: { size: widths[index], type: WidthType.DXA },
      margins: { top: 50, bottom: 50, left: 80, right: 80 },
      shading: header
        ? { type: ShadingType.CLEAR, fill: HEADER_FILL, color: "auto" }
        : undefined,
      borders: {
        top: NO_BORDER,
        left: NO_BORDER,
        right: NO_BORDER,
        bottom: RULE_BORDER,
      },
      children: [
        new Paragraph({
          alignment:
            columns[index].align === "right"
              ? AlignmentType.RIGHT
              : AlignmentType.LEFT,
          children: [
            header
              ? text(value.toUpperCase(), {
                  bold: true,
                  size: fontSize - 4,
                  color: MUTED,
                })
              : text(value, { size: fontSize }),
          ],
        }),
      ],
    });

  return new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: columns.map((column, index) =>
          cell(column.header, index, true),
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            cantSplit: true,
            children: row.map((value, index) => cell(value, index, false)),
          }),
      ),
    ],
  });
}

function kpiTable(
  kpis: { label: string; value: string; caption: string }[],
): Table {
  const width = Math.floor(PORTRAIT_CONTENT / kpis.length);
  const border = RULE_BORDER;
  return new Table({
    width: { size: width * kpis.length, type: WidthType.DXA },
    columnWidths: kpis.map(() => width),
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        cantSplit: true,
        children: kpis.map(
          (kpi) =>
            new TableCell({
              width: { size: width, type: WidthType.DXA },
              margins: { top: 120, bottom: 120, left: 120, right: 120 },
              borders: {
                top: border,
                bottom: border,
                left: border,
                right: border,
              },
              children: [
                new Paragraph({
                  children: [
                    text(kpi.label.toUpperCase(), {
                      bold: true,
                      size: 14,
                      color: MUTED,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60, after: 40 },
                  children: [text(kpi.value, { bold: true, size: 40 })],
                }),
                new Paragraph({
                  children: [text(kpi.caption, { size: 15, color: MUTED })],
                }),
              ],
            }),
        ),
      }),
    ],
  });
}

type Block = Paragraph | Table;

/**
 * Builds the complete report document for one campaign as a .docx blob.
 * Runs in the browser (charts are rasterised on a canvas).
 */
export async function buildCampaignReportDocx(
  report: CampaignAnalyticsReport,
): Promise<Blob> {
  const a = report.analytics;
  const series0 = SERIES_COLORS_LIGHT[0];
  const blocks: Block[] = [];

  const formatDate = (iso: string | null): string => {
    if (!iso) return "—";
    const date = new Date(iso);
    return isNaN(date.getTime())
      ? "—"
      : date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: a.timezone,
        });
  };

  // --- Cover block ---------------------------------------------------------
  const metaLine = (label: string, value: string): Paragraph =>
    new Paragraph({
      spacing: { after: 20 },
      children: [
        text(`${label}  `, { size: 18, color: MUTED }),
        text(value, { size: 18, bold: true }),
      ],
    });
  blocks.push(
    new Paragraph({
      children: [
        text("CAMPAIGN ANALYTICS REPORT", {
          bold: true,
          size: 16,
          color: MUTED,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 160 },
      children: [text(a.campaign.name, { bold: true, size: 44 })],
    }),
  );
  if (report.organization) {
    blocks.push(metaLine("Organization", report.organization.name));
  }
  blocks.push(
    metaLine("Status", a.campaign.status),
    metaLine(
      "Campaign period",
      `${formatDate(a.campaign.start_date)} – ${formatDate(a.campaign.end_date)}`,
    ),
    metaLine("Generated", `${report.generated_at} (${a.timezone})`),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  );

  // --- Key metrics ---------------------------------------------------------
  const burn = a.prize_burn_rate;
  blocks.push(
    kpiTable([
      {
        label: "Total entries",
        value: num(a.total_entries),
        caption: "Participations recorded",
      },
      {
        label: "Average dwell time",
        value: formatDuration(a.avg_dwell_time_seconds),
        caption:
          a.avg_dwell_time_seconds === null
            ? "No dwell time recorded yet"
            : "Time spent per participant",
      },
      {
        label: "Win rate",
        value: formatRate(a.win_rate),
        caption: `${num(a.total_wins)} winners of ${num(a.total_entries)} entries`,
      },
      {
        label: "Completion rate",
        value: formatRate(a.completion_rate),
        caption:
          a.completion_rate === null
            ? "No visitor sessions tracked yet"
            : `${num(a.completed_impressions)} of ${num(a.total_impressions)} visitors completed the form`,
      },
      {
        label: "Prize burn rate",
        value: formatRate(burn.percentage),
        caption:
          burn.percentage === null
            ? "No prize stock allocated"
            : `${num(burn.total_won)} of ${num(burn.total_quantity)} prizes won`,
      },
    ]),
  );

  // --- Participants over time ---------------------------------------------
  blocks.push(
    ...sectionHeading("Participants over time", "Entries recorded per day."),
  );
  if (a.participants_over_time.length === 0) {
    blocks.push(note("No participants recorded yet."));
  } else {
    blocks.push(
      await chartImage(
        lineChartSvg(
          a.participants_over_time.map((d) => formatDayLabel(d.date)),
          a.participants_over_time.map((d) => d.entries),
          series0,
        ),
      ),
      dataTable(
        [
          { header: "Date", weight: 2 },
          { header: "Entries", weight: 1, align: "right" },
          { header: "Winners", weight: 1, align: "right" },
        ],
        a.participants_over_time.map((d) => [
          d.date,
          num(d.entries),
          num(d.winners),
        ]),
        PORTRAIT_CONTENT,
      ),
    );
  }

  // --- OS distribution -----------------------------------------------------
  const osItems: DonutItem[] = [
    { label: "Android", count: a.os_distribution.android },
    { label: "iOS", count: a.os_distribution.ios },
    { label: "Desktop", count: a.os_distribution.desktop },
    { label: "Other", count: a.os_distribution.other },
  ].map((item, index) => ({ ...item, color: SERIES_COLORS_LIGHT[index] }));
  const osTotal = osItems.reduce((sum, item) => sum + item.count, 0);
  blocks.push(
    ...sectionHeading(
      "OS distribution",
      "Share of participants by device operating system.",
    ),
  );
  if (osTotal === 0) {
    blocks.push(note("No participants recorded yet."));
  } else {
    blocks.push(
      await chartImage(donutSvg(osItems, "PARTICIPANTS")),
      colorLegend(osItems.map((i) => ({ name: i.label, color: i.color }))),
      dataTable(
        [
          { header: "Operating system", weight: 2 },
          { header: "Participants", weight: 1, align: "right" },
          { header: "Share", weight: 1, align: "right" },
        ],
        osItems.map((item) => [
          item.label,
          num(item.count),
          share(item.count, osTotal),
        ]),
        PORTRAIT_CONTENT,
      ),
    );
  }

  // --- Prize distribution + stock -----------------------------------------
  const prize = buildPrizeSeries(
    a.prize_distribution,
    a.participants_over_time,
  );
  const prizeSeries: StackSeries[] = prize.series.map((s) => ({
    name: s.name,
    color:
      s.colorIndex === null
        ? OTHER_SERIES_COLOR
        : SERIES_COLORS_LIGHT[s.colorIndex],
    values: prize.rows.map((row) => row.values[s.key] ?? 0),
  }));
  blocks.push(
    ...sectionHeading("Prize distribution", "Prizes won per day, by prize."),
  );
  if (prizeSeries.length === 0) {
    blocks.push(note("No prizes have been won yet."));
  } else {
    blocks.push(
      colorLegend(prizeSeries),
      await chartImage(
        stackedAreaSvg(
          prize.rows.map((row) => formatDayLabel(row.date)),
          prizeSeries,
        ),
      ),
    );
  }
  if (a.prizes.length > 0) {
    blocks.push(
      subHeading("Prize stock"),
      dataTable(
        [
          { header: "Prize", weight: 3 },
          { header: "Allocated", weight: 1, align: "right" },
          { header: "Won", weight: 1, align: "right" },
          { header: "Remaining", weight: 1, align: "right" },
          { header: "Burn rate", weight: 1, align: "right" },
        ],
        a.prizes.map((p) => [
          p.name,
          num(p.quantity),
          num(p.quantity_won),
          num(p.remaining),
          formatRate(p.burn_rate_percentage),
        ]),
        PORTRAIT_CONTENT,
      ),
    );
  }

  // --- Time segmentation ---------------------------------------------------
  blocks.push(
    ...sectionHeading(
      "Time segmentation",
      `When participants enter, in ${a.timezone} time.`,
    ),
  );
  if (a.total_entries === 0) {
    blocks.push(note("No participants recorded yet."));
  } else {
    blocks.push(
      subHeading("By hour of the day"),
      await chartImage(
        barChartSvg(
          a.hourly_distribution.map(
            (h) => `${String(h.hour).padStart(2, "0")}h`,
          ),
          a.hourly_distribution.map((h) => h.entries),
          series0,
          REPORT_HALF_CHART_WIDTH,
        ),
      ),
      subHeading("By day of the week"),
      await chartImage(
        barChartSvg(
          a.weekday_distribution.map(
            (w) => WEEKDAY_LABELS[w.weekday - 1] ?? String(w.weekday),
          ),
          a.weekday_distribution.map((w) => w.entries),
          series0,
          REPORT_HALF_CHART_WIDTH,
        ),
      ),
    );
  }

  // --- Wilaya segmentation -------------------------------------------------
  const wilaya = buildWilayaBreakdown(a.location_distribution);
  blocks.push(
    ...sectionHeading(
      "Segmentation by wilaya",
      "Participants per wilaya, from the location captured on each entry.",
    ),
  );
  if (a.location_distribution.length === 0) {
    blocks.push(
      note(
        "No location data has been captured for this campaign's participants yet.",
      ),
    );
  } else {
    blocks.push(
      await chartImage(wilayaMapSvg(wilaya.counts, wilaya.maxCount), 420),
    );
    if (wilaya.ranked.length === 0) {
      blocks.push(note("None of the captured locations match a wilaya."));
    } else {
      blocks.push(
        dataTable(
          [
            { header: "Code", weight: 1 },
            { header: "Wilaya", weight: 3 },
            { header: "Participants", weight: 1.5, align: "right" },
            { header: "Share", weight: 1.5, align: "right" },
          ],
          wilaya.ranked.map((w) => [
            String(w.code).padStart(2, "0"),
            w.name,
            num(w.count),
            share(w.count, wilaya.totalLocated),
          ]),
          PORTRAIT_CONTENT,
        ),
      );
    }
  }
  const notOnMap = [
    a.location_unknown_count > 0 &&
      `${num(a.location_unknown_count)} without location data`,
    wilaya.unmatchedCount > 0 &&
      `${num(wilaya.unmatchedCount)} in a location that does not match a wilaya`,
  ].filter(Boolean);
  if (notOnMap.length > 0) {
    blocks.push(note(`Not on the map: ${notOnMap.join(", ")}.`));
  }

  // --- Participants (landscape pages) -------------------------------------
  const truncated = report.participants_total > report.participants.length;
  const participantBlocks: Block[] = [
    ...sectionHeading(
      "Participants",
      truncated
        ? `Showing the ${num(report.participants.length)} most recent of ${num(report.participants_total)} participants.`
        : `All ${num(report.participants_total)} participants, most recent first.`,
    ),
  ];
  if (report.participants.length === 0) {
    participantBlocks.push(note("No participants recorded yet."));
  } else {
    participantBlocks.push(
      dataTable(
        [
          { header: "Participant", weight: 2.4 },
          { header: "Phone", weight: 1.5 },
          { header: "Result / prize", weight: 2 },
          { header: "Dwell time", weight: 1, align: "right" },
          { header: "Quiz", weight: 0.9 },
          { header: "Coupon code", weight: 2.2 },
          { header: "Confirmed", weight: 1.1 },
          { header: "Location", weight: 1.5 },
          { header: "Submitted", weight: 1.8 },
        ],
        report.participants.map((p) => [
          p.participant_name || "Anonymous player",
          p.phone_number || "—",
          p.is_winner ? p.prize_name || "Winner" : "No win",
          formatDuration(
            p.dwell_time_seconds > 0 ? p.dwell_time_seconds : null,
          ),
          p.quiz_passed === true
            ? "Passed"
            : p.quiz_passed === false
              ? "Failed"
              : "—",
          p.redeemed_coupon_value || "—",
          p.redeemed_coupon_value ? (p.coupon_confirmed ? "Yes" : "No") : "—",
          p.location || "—",
          p.submitted_at,
        ]),
        LANDSCAPE_CONTENT,
        16,
      ),
    );
  }

  const margin = {
    top: PAGE_MARGIN,
    bottom: PAGE_MARGIN,
    left: PAGE_MARGIN,
    right: PAGE_MARGIN,
  };
  const document = new Document({
    title: `${a.campaign.name} — Campaign analytics report`,
    creator: report.organization?.name ?? "Campaign analytics",
    styles: { default: { document: { run: { font: FONT, size: 20 } } } },
    sections: [
      {
        properties: {
          page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin },
        },
        children: blocks,
      },
      {
        properties: {
          page: {
            size: {
              width: PAGE_WIDTH,
              height: PAGE_HEIGHT,
              orientation: PageOrientation.LANDSCAPE,
            },
            margin,
          },
        },
        children: participantBlocks,
      },
    ],
  });

  return Packer.toBlob(document);
}

/** Color key for a chart: a colored square followed by the series name. */
function colorLegend(items: { name: string; color: string }[]): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    children: items.flatMap((item, index) => [
      new TextRun({
        text: "■ ",
        font: FONT,
        size: 20,
        color: item.color.replace("#", ""),
      }),
      text(index < items.length - 1 ? `${item.name}     ` : item.name, {
        size: 18,
        color: MUTED,
      }),
    ]),
  });
}

/** File name (without extension) for a campaign's exported report. */
export function campaignReportFilename(
  report: CampaignAnalyticsReport,
): string {
  const name = report.analytics.campaign.name
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  const date = report.generated_at.slice(0, 10);
  return `octoreach_report_${name || "campaign"}_${date}`;
}
