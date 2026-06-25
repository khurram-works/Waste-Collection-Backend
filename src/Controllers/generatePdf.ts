import express from "express";
import puppeteer from "puppeteer";


const T = {
  emerald: "#059669",
  emeraldDark: "#047857",
  emeraldLight: "#10b981",
  emeraldGhost: "#d1fae5",
  emeraldFaint: "#ecfdf5",
  sky: "#0284c7",
  skyGhost: "#e0f2fe",
  amber: "#d97706",
  amberGhost: "#fef3c7",
  rose: "#e11d48",
  roseGhost: "#ffe4e6",
  violet: "#7c3aed",
  violetGhost: "#ede9fe",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray700: "#374151",
  gray900: "#111827",
  white: "#ffffff",
};



interface Trend {
  value: string;
  dir: "up" | "down" | "flat";
}

interface KpiCard {
  label: string;
  value?: string;
  icon: string;
  trend: Trend;
  accent?: string;
  highlight?: boolean;
}

interface WasteItem {
  label: string;
  pct: number;
  color: string;
}

interface WeeklyDay {
  label: string;
  pending?: number;
  collected?: number;
  paid?: number;
}

interface BestWorker {
  name?: string;
  efficiency?: number;
  vehicle?: string;
  completedTasks?: number;
  totalTasks?: number;
}

interface WorkerZone {
  zoneId?: number;
  zoneName?: string;
  bestWorker?: BestWorker | null;
}

interface AuditLog {
  auditId: string;
  timestamp: string;
  userRole: string;
  action: string;
  status: string;
  targetType?: string;
}

interface ReportPayload {
  reportData: Record<string, unknown>;
  workersData: WorkerZone[];
  systemReport: AuditLog[];
  weeklyReport: WeeklyDay[];
  wasteItems: WasteItem[];
  kpiCards: KpiCard[];
  generatedAt: string;
  timeRange: string;
  zone: string;
}

function trendBadge(trend: Trend): string {
  const color =
    trend.dir === "up" ? T.emerald : trend.dir === "down" ? T.rose : T.gray500;
  const bg =
    trend.dir === "up"
      ? T.emeraldGhost
      : trend.dir === "down"
        ? T.roseGhost
        : T.gray100;
  const arrow = trend.dir === "up" ? "▲" : trend.dir === "down" ? "▼" : "—";
  return `<span style="background:${bg}; color:${color}; padding:2px 8px; border-radius:999px;
    font-size:11px; font-weight:700;">${arrow} ${trend.value}</span>`;
}


function efficiencyBar(pct: number = 0): string {
  const color = pct >= 80 ? T.emerald : pct >= 60 ? T.amber : T.rose;
  return `
    <div style="display:flex; align-items:center; gap:8px;">
      <div style="width:80px; height:6px; background:${T.gray100}; border-radius:999px; overflow:hidden;">
        <div style="width:${Math.min(pct, 100)}%; height:100%; background:${color}; border-radius:999px;"></div>
      </div>
      <span style="font-size:12px; font-weight:700; color:${color};">${pct}%</span>
    </div>`;
}

function buildReportHTML(payload: ReportPayload): string {
  const {
    workersData,
    systemReport,
    weeklyReport,
    wasteItems,
    kpiCards,
    generatedAt,
    timeRange,
    zone,
  } = payload;

  const kpiCardsHTML = kpiCards
    .map((card: KpiCard) => {
      const bg = card.highlight
        ? `linear-gradient(135deg, ${T.emeraldDark}, ${T.emerald})`
        : T.white;
      const valueColor = card.highlight ? "#fff" : T.gray900;
      const labelColor = card.highlight ? "rgba(255,255,255,0.8)" : T.gray400;
      const borderStyle = card.highlight ? "none" : `1px solid ${T.gray200}`;
      const accentStrip = card.highlight
        ? ""
        : `<div style="position:absolute; top:0; left:0; right:0; height:3px;
           background:${T.emerald}; border-radius:12px 12px 0 0;"></div>`;
      return `
      <div style="background:${bg}; border-radius:12px; padding:16px;
        border:${borderStyle}; position:relative; overflow:hidden;
        box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        ${accentStrip}
        <div style="font-size:10px; font-weight:600; text-transform:uppercase;
          letter-spacing:0.1em; color:${labelColor}; margin-bottom:8px;">${card.label}</div>
        <div style="font-size:22px; font-weight:800; color:${valueColor};
          margin-bottom:8px; letter-spacing:-0.02em;">${card.value ?? "—"}</div>
        ${trendBadge(card.trend)}
      </div>`;
    })
    .join("");

  const weeklyTableRows = weeklyReport
    .map(
      (day: WeeklyDay) => `
    <tr>
      <td style="padding:10px 16px; font-weight:600; color:${T.gray700};">${day.label}</td>
      <td style="padding:10px 16px; text-align:center;">
        <span style="background:${T.amberGhost}; color:${T.amber}; padding:2px 10px;
          border-radius:999px; font-size:12px; font-weight:600;">${day.pending ?? 0}</span>
      </td>
      <td style="padding:10px 16px; text-align:center;">
        <span style="background:${T.skyGhost}; color:${T.sky}; padding:2px 10px;
          border-radius:999px; font-size:12px; font-weight:600;">${day.collected ?? 0}</span>
      </td>
      <td style="padding:10px 16px; text-align:center;">
        <span style="background:${T.emeraldGhost}; color:${T.emerald}; padding:2px 10px;
          border-radius:999px; font-size:12px; font-weight:600;">${day.paid ?? 0}</span>
      </td>
    </tr>`,
    )
    .join("");

  const wasteRows = wasteItems
    .filter((item: WasteItem) => item.pct > 0)
    .map(
      (item: WasteItem) => `
      <tr>
        <td style="padding:10px 16px;">
          <span style="display:inline-flex; align-items:center; gap:8px;">
            <span style="width:10px; height:10px; border-radius:3px;
              background:${item.color}; display:inline-block;"></span>
            <span style="font-size:13px; color:${T.gray700};">${item.label}</span>
          </span>
        </td>
        <td style="padding:10px 16px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:120px; height:7px; background:${T.gray100};
              border-radius:999px; overflow:hidden;">
              <div style="width:${item.pct}%; height:100%; background:${item.color};
                border-radius:999px;"></div>
            </div>
            <span style="font-size:13px; font-weight:700; color:${item.color};">${item.pct}%</span>
          </div>
        </td>
      </tr>`,
    )
    .join("");

  const workerRows = workersData
    .map((w: WorkerZone, idx: number) => {
      if (!w.bestWorker) {
        return `<tr><td colspan="5" style="padding:12px 16px; color:${T.gray400};
        font-style:italic; font-size:13px;">${w.zoneName} — No worker data</td></tr>`;
      }
      const worker = w.bestWorker;
      const initials = (worker.name || "?")
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      return `
      <tr style="border-bottom:1px solid ${T.gray100};">
        <td style="padding:12px 16px; font-weight:700; color:${T.gray400};">#${idx + 1}</td>
        <td style="padding:12px 16px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:32px; height:32px; border-radius:10px; flex-shrink:0;
              background:linear-gradient(135deg,${T.emerald},${T.emeraldLight});
              display:flex; align-items:center; justify-content:center;
              font-weight:700; font-size:11px; color:#fff;">${initials}</div>
            <div>
              <div style="font-weight:600; font-size:13px; color:${T.gray900};">${worker.name ?? "—"}</div>
              <div style="font-size:11px; color:${T.gray400};">${worker.vehicle ?? "—"}</div>
            </div>
          </div>
        </td>
        <td style="padding:12px 16px;">
          <span style="background:${T.emeraldFaint}; color:${T.emerald}; padding:2px 10px;
            border-radius:999px; font-size:11px; font-weight:600;">${w.zoneName ?? "—"}</span>
        </td>
        <td style="padding:12px 16px; font-size:13px; color:${T.gray700};">
          <strong>${worker.completedTasks ?? 0}</strong>
          <span style="color:${T.gray300};"> / </span>
          <span style="color:${T.gray400};">${worker.totalTasks ?? 0}</span>
        </td>
        <td style="padding:12px 16px;">${efficiencyBar(worker.efficiency ?? 0)}</td>
      </tr>`;
    })
    .join("");

  const actionColors: Record<string, { color: string; bg: string }> = {
    LOGIN: { color: T.sky, bg: T.skyGhost },
    LOGOUT: { color: T.gray500, bg: T.gray100 },
    CREATE: { color: T.emerald, bg: T.emeraldGhost },
    UPDATE: { color: T.amber, bg: T.amberGhost },
    DELETE: { color: T.rose, bg: T.roseGhost },
  };

  const activityRows = systemReport
    .slice(0, 15)
    .map((log: AuditLog) => {
      const ac = actionColors[log.action] ?? {
        color: T.gray500,
        bg: T.gray100,
      };
      const statusColor = log.status === "SUCCESS" ? T.emerald : T.rose;
      const statusBg = log.status === "SUCCESS" ? T.emeraldGhost : T.roseGhost;
      const formattedTime = (() => {
        try {
          return new Date(log.timestamp).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch {
          return log.timestamp;
        }
      })();
      return `
      <tr style="border-bottom:1px solid ${T.gray100};">
        <td style="padding:10px 16px;">
          <span style="background:${ac.bg}; color:${ac.color}; padding:2px 10px;
            border-radius:999px; font-size:11px; font-weight:700;">${log.action}</span>
        </td>
        <td style="padding:10px 16px;">
          <span style="background:${statusBg}; color:${statusColor}; padding:2px 10px;
            border-radius:999px; font-size:11px; font-weight:600;">${log.status}</span>
        </td>
        <td style="padding:10px 16px; font-size:12px; color:${T.gray500};">${log.userRole}</td>
        <td style="padding:10px 16px; font-size:12px; color:${T.gray400};">${log.targetType ?? "—"}</td>
        <td style="padding:10px 16px; font-size:11px; color:${T.gray300};">${formattedTime}</td>
      </tr>`;
    })
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #fff; color: ${T.gray900}; font-size: 14px; line-height: 1.5; }
        .page { padding: 32px 36px; }
        .card { background: ${T.white}; border-radius: 14px; border: 1px solid ${T.gray200}; overflow: hidden; margin-bottom: 24px; }
        .card-header { padding: 18px 22px; border-bottom: 1px solid ${T.gray100}; }
        .card-title { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 16px; color: ${T.gray900}; }
        .card-subtitle { font-size: 12px; color: ${T.gray400}; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 10px 16px; text-align: left; font-family: 'Outfit', sans-serif; font-size: 10px;
          text-transform: uppercase; letter-spacing: 0.1em; color: ${T.gray400}; font-weight: 700;
          background: ${T.gray50}; border-bottom: 1px solid ${T.gray100}; }
        td { font-size: 13px; color: ${T.gray700}; }
        tr:nth-child(even) td { background: ${T.gray50}; }
        .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 24px; }
        .two-col { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 24px; }
        .page-break { page-break-before: always; }
      </style>
    </head>
    <body>
      <div class="page">
        <div style="display:flex; justify-content:space-between; align-items:center;
          margin-bottom:28px; padding-bottom:20px; border-bottom:2px solid ${T.emerald};">
          <div>
            <h1 style="font-family:'Outfit',sans-serif; font-size:20px; font-weight:800; color:${T.gray900};">
              Reports &amp; Analytics
            </h1>
            <p style="font-size:12px; color:${T.gray400}; margin-top:2px;">
              Smart<span style="color:${T.emerald}; font-weight:700;">Waste</span> Platform Performance Report
            </p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px; color:${T.gray400};">Generated on</div>
            <div style="font-size:13px; font-weight:600; color:${T.gray700};">${generatedAt}</div>
            <div style="margin-top:6px;">
              <span style="background:${T.emeraldGhost}; color:${T.emerald}; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600;">${timeRange}</span>
              <span style="background:${T.skyGhost}; color:${T.sky}; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:600; margin-left:6px;">${zone}</span>
            </div>
          </div>
        </div>

        <div style="font-family:'Outfit',sans-serif; font-size:13px; font-weight:700;
          text-transform:uppercase; letter-spacing:0.08em; color:${T.gray400}; margin-bottom:12px;">
          Key Performance Indicators
        </div>
        <div class="kpi-grid">${kpiCardsHTML}</div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Pickup Activity</div>
            <div class="card-subtitle">Daily volume breakdown by status</div>
          </div>
          <table>
            <thead><tr><th>Day</th><th style="text-align:center;">Pending</th><th style="text-align:center;">Collected</th><th style="text-align:center;">Paid</th></tr></thead>
            <tbody>${weeklyTableRows}</tbody>
          </table>
        </div>

          <div class="card" style="margin-bottom:10;">
            <div class="card-header">
              <div class="card-title">Top Performing Workers</div>
              <div class="card-subtitle">Ranked by efficiency and completed pickups</div>
            </div>
            <table>
              <thead><tr><th>#</th><th>Worker</th><th>Zone</th><th>Tasks</th><th>Efficiency</th></tr></thead>
              <tbody>${workerRows}</tbody>
            </table>
          </div>
          <div class="card" style="margin-bottom:10;">
            <div class="card-header">
              <div class="card-title">Waste Composition</div>
              <div class="card-subtitle">Breakdown by material type</div>
            </div>
            <table>
              <thead><tr><th>Material</th><th>Share</th></tr></thead>
              <tbody>${wasteRows}</tbody>
            </table>
          </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">System Activity Log</div>
            <div class="card-subtitle">Recent operational events (latest 15)</div>
          </div>
          <table>
            <thead><tr><th>Action</th><th>Status</th><th>Role</th><th>Target</th><th>Time</th></tr></thead>
            <tbody>${activityRows}</tbody>
          </table>
        </div>

        <div style="text-align:center; padding:12px 0; border-top:1px solid ${T.gray100};">
          <span style="font-size:11px; color:${T.gray300};">
            Smart<span style="color:${T.emerald};">Waste</span> Platform · Confidential Report · ${generatedAt}
          </span>
        </div>
      </div>
    </body>
    </html>`;
}

export async function generatePdf(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  let browser;
  try {
    const payload = req.body as ReportPayload;
    const html = buildReportHTML(payload);

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", bottom: "10mm" },
    });

    await browser.close();

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="SmartWaste_Report.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    if (browser) await browser.close(); 
    console.error("PDF generation error:", err);

    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ message: "Failed to generate PDF", error: message });
  }
}
