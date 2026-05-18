const { useEffect, useState, useRef } = React;

const today = new Date();
const SALES_PLACEHOLDER = { openOrdersValue: 184500, invoicedThisMonth: 97200 };

const AIRTABLE_PAT   = "pattatu3AWoZ8k7QJ.4bd5e454a785c010c3638fda3a1573de28c89f929581313e412c8ebeae1f69d7";
const AIRTABLE_BASE  = "apphx8sevYVh7meEf";
const BILLS_TABLE    = "tblF2CiqReklsVZLQ";
const INVOICES_TABLE = "tblrlvmLgyefaDfrj";

// ── HELPERS ────────────────────────────────────────────────────────────────────

function fmt$$(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function dayDiff(d) {
  return Math.round((d - today) / 86400000);
}

function statusColor(s) {
  if (s === "overdue") return { bg: "rgba(239,68,68,0.15)",  text: "#f87171" };
  if (s === "soon")    return { bg: "rgba(251,191,36,0.15)", text: "#fbbf24" };
  return                      { bg: "rgba(16,185,129,0.15)", text: "#34d399" };
}

function statusLabel(s, due) {
  const d = dayDiff(due);
  if (s === "overdue") return `${Math.abs(d)}d overdue`;
  if (d === 0)         return "Due today";
  if (d === 1)         return "Due tomorrow";
  return `${d}d`;
}

function computeStatus(due) {
  const d = dayDiff(due);
  if (d < 0) return "overdue";
  if (d <= 7) return "soon";
  return "ok";
}

// ── DERIVED DATA BUILDERS ──────────────────────────────────────────────────────

function groupByDay(rows, nameKey) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row[nameKey]}|${row.due.toISOString().slice(0, 10)}`;
    if (map.has(key)) {
      map.get(key).amount += row.amount;
    } else {
      map.set(key, { ...row });
    }
  }
  return [...map.values()];
}

function buildKpis(invoices, bills) {
  const overdueInv = invoices.filter(i => i.status === "overdue");
  const soonInv    = invoices.filter(i => i.status === "soon");
  return {
    totalAR:         invoices.reduce((s, i) => s + i.amount, 0),
    totalAP:         bills.reduce((s, b) => s + b.amount, 0),
    overdueAmount:   overdueInv.reduce((s, i) => s + i.amount, 0),
    overdueCount:    overdueInv.length,
    next7DaysAmount: soonInv.reduce((s, i) => s + i.amount, 0),
    next7DaysCount:  soonInv.length,
  };
}

function buildCashFlow(invoices, bills) {
  const dow = today.getDay();
  const daysToMon = dow === 0 ? -6 : 1 - dow;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() + daysToMon);
  weekStart.setHours(0, 0, 0, 0);

  const weeks = Array.from({ length: 6 }, (_, i) => {
    const s = new Date(weekStart);
    s.setDate(weekStart.getDate() + i * 7);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    const fmt = d => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { week: `Wk ${i + 1}`, label: `${fmt(s)}–${fmt(e)}`, s, e, inflow: 0, outflow: 0 };
  });

  for (const inv of invoices) {
    const w = weeks.find(w => inv.due >= w.s && inv.due <= w.e);
    if (w) w.inflow += inv.amount;
  }
  for (const bill of bills) {
    const w = weeks.find(w => bill.due >= w.s && bill.due <= w.e);
    if (w) w.outflow += bill.amount;
  }

  return weeks.map(({ week, label, inflow, outflow }) => ({ week, label, inflow, outflow }));
}

// ── CARD STYLE ─────────────────────────────────────────────────────────────────
const card = {
  borderRadius: "28px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
  backdropFilter: "blur(12px)",
  overflow: "hidden",
};

const cardHeader = {
  padding: "16px 24px",
  borderBottom: "1px solid rgba(255,255,255,0.07)",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.45)",
};

// ── CASH FLOW CHART ────────────────────────────────────────────────────────────

function CashFlowChart({ data }) {
  const svgRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 180 });

  useEffect(() => {
    if (!svgRef.current) return;
    const obs = new ResizeObserver(([e]) => {
      setDims({ w: e.contentRect.width, h: 180 });
    });
    obs.observe(svgRef.current.parentElement);
    return () => obs.disconnect();
  }, []);

  const { w, h } = dims;
  const padL = 52, padR = 16, padT = 28, padB = 36;
  const iW = w - padL - padR;
  const iH = h - padT - padB;
  const n = data.length;
  const slot = iW / n;
  const bw = slot * 0.22;

  let bal = 0;
  const balances = data.map(d => { bal += d.inflow - d.outflow; return bal; });

  const allVals = [...data.map(d => d.inflow), ...data.map(d => d.outflow), ...balances];
  const minV = Math.min(...allVals) * 0.8;
  const maxV = Math.max(...allVals) * 1.1;

  function sy(v) { return padT + iH - ((v - minV) / (maxV - minV)) * iH; }
  function cx(i) { return padL + i * slot + slot / 2; }

  // grid lines
  const gridLines = [0, 1, 2, 3, 4].map(i => {
    const v = minV + (maxV - minV) * (i / 4);
    const y = sy(v);
    const label = v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${Math.round(v)}`;
    return React.createElement(React.Fragment, { key: i },
      React.createElement("line", { x1: padL, y1: y, x2: w - padR, y2: y, stroke: "rgba(255,255,255,0.05)", strokeWidth: 1 }),
      React.createElement("text", { x: padL - 6, y: y + 4, textAnchor: "end", fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "Inter, system-ui, sans-serif" }, label)
    );
  });

  // bars
  const bars = data.map((d, i) => {
    const net = d.inflow - d.outflow;
    const netCol = net >= 0 ? "#34d399" : "#f87171";
    return React.createElement(React.Fragment, { key: i },
      // inflow
      React.createElement("rect", {
        x: cx(i) - bw - 2, y: sy(d.inflow),
        width: bw, height: h - padB - sy(d.inflow),
        fill: "rgba(56,189,248,0.55)", rx: 3,
      }),
      // outflow
      React.createElement("rect", {
        x: cx(i) + 2, y: sy(d.outflow),
        width: bw, height: h - padB - sy(d.outflow),
        fill: "rgba(239,68,68,0.50)", rx: 3,
      }),
      // net label
      React.createElement("text", {
        x: cx(i), y: Math.min(sy(d.inflow), sy(d.outflow)) - 6,
        textAnchor: "middle", fill: netCol,
        fontSize: 10, fontWeight: 700, fontFamily: "Inter, system-ui, sans-serif",
      }, `${net >= 0 ? "+" : ""}${Math.round(net / 1000)}k`),
      // week label
      React.createElement("text", {
        x: cx(i), y: h - padB + 14,
        textAnchor: "middle", fill: "rgba(255,255,255,0.35)",
        fontSize: 10, fontFamily: "Inter, system-ui, sans-serif",
      }, d.week),
      React.createElement("text", {
        x: cx(i), y: h - padB + 26,
        textAnchor: "middle", fill: "rgba(255,255,255,0.18)",
        fontSize: 9, fontFamily: "Inter, system-ui, sans-serif",
      }, d.label),
    );
  });

  // balance line
  const pts = data.map((_, i) => `${cx(i)},${sy(balances[i])}`).join(" ");
  const balanceDots = data.map((_, i) =>
    React.createElement(React.Fragment, { key: i },
      React.createElement("circle", { cx: cx(i), cy: sy(balances[i]), r: 4, fill: "#020617", stroke: "#34d399", strokeWidth: 2 }),
      React.createElement("text", {
        x: cx(i), y: sy(balances[i]) - 9,
        textAnchor: "middle", fill: "#34d399",
        fontSize: 10, fontWeight: 700, fontFamily: "Inter, system-ui, sans-serif",
      }, `$${Math.round(balances[i] / 1000)}k`),
    )
  );

  return React.createElement("div", { ref: svgRef, style: { width: "100%", height: h } },
    React.createElement("svg", { width: w, height: h, overflow: "visible" },
      React.createElement("defs", null,
        React.createElement("linearGradient", { id: "balGrad", x1: "0", y1: "0", x2: "1", y2: "0" },
          React.createElement("stop", { offset: "0%", stopColor: "#34d399", stopOpacity: 0.4 }),
          React.createElement("stop", { offset: "100%", stopColor: "#34d399", stopOpacity: 1 }),
        )
      ),
      ...gridLines,
      React.createElement("line", { x1: padL, y1: padT, x2: padL, y2: h - padB, stroke: "rgba(255,255,255,0.07)", strokeWidth: 1 }),
      React.createElement("line", { x1: padL, y1: h - padB, x2: w - padR, y2: h - padB, stroke: "rgba(255,255,255,0.07)", strokeWidth: 1 }),
      ...bars,
      React.createElement("polyline", { points: pts, fill: "none", stroke: "url(#balGrad)", strokeWidth: 2, strokeDasharray: "5 3", strokeLinejoin: "round", strokeLinecap: "round" }),
      ...balanceDots,
    )
  );
}

// ── TABLE ──────────────────────────────────────────────────────────────────────

function FinanceTable({ title, rows, nameKey }) {
  return React.createElement("div", { style: { ...card, display: "flex", flexDirection: "column" } },
    React.createElement("div", { style: cardHeader }, title),
    React.createElement("table", { style: { width: "100%", borderCollapse: "collapse" } },
      React.createElement("thead", null,
        React.createElement("tr", null,
          ["Name", "Amount", "Due", "Status"].map(h =>
            React.createElement("th", {
              key: h,
              style: {
                padding: "10px 20px", textAlign: h === "Amount" || h === "Status" ? "right" : "left",
                fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase",
                color: "rgba(255,255,255,0.30)", borderBottom: "1px solid rgba(255,255,255,0.07)",
              }
            }, h)
          )
        )
      ),
      React.createElement("tbody", null,
        rows.map((row, i) => {
          const sc = statusColor(row.status);
          const diff = dayDiff(row.due);
          return React.createElement("tr", {
            key: i,
            style: { borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }
          },
            React.createElement("td", { style: { padding: "11px 20px", fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, row[nameKey]),
            React.createElement("td", { style: { padding: "11px 20px", fontSize: 15, fontWeight: 700, color: "white", textAlign: "right", letterSpacing: "-0.02em" } }, fmt$$(row.amount)),
            React.createElement("td", { style: { padding: "11px 20px", fontSize: 13, color: "rgba(255,255,255,0.45)", textAlign: "right", whiteSpace: "nowrap" } }, fmtDate(row.due)),
            React.createElement("td", { style: { padding: "11px 20px", textAlign: "right" } },
              React.createElement("span", {
                style: {
                  display: "inline-block", padding: "3px 10px", borderRadius: 999,
                  fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.text,
                  whiteSpace: "nowrap",
                }
              }, statusLabel(row.status, row.due))
            )
          );
        })
      )
    )
  );
}

// ── KPI CARD ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accentColor }) {
  return React.createElement("div", {
    style: {
      ...card,
      padding: "24px 28px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
    }
  },
    React.createElement("div", { style: { fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)", marginBottom: 10 } }, label),
    React.createElement("div", { style: { fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "white" } }, value),
    sub && React.createElement("div", { style: { marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.35)" } }, sub),
  );
}

// ── SALES KPI CARD (combined) ──────────────────────────────────────────────────

function SalesKpiCard({ forecasted, openOrders, invoiced }) {
  return React.createElement("div", {
    style: {
      ...card,
      padding: "24px 28px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
    }
  },
    React.createElement("div", { style: { fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.40)", marginBottom: 10 } }, "Forecasted Sales"),
    React.createElement("div", { style: { fontSize: 32, fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 1, color: "white" } }, fmt$$(forecasted)),
    React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.35)", letterSpacing: "0.01em" } },
      React.createElement("span", { style: { color: "rgba(56,189,248,0.80)" } }, "OS: "),
      React.createElement("span", null, fmt$$(openOrders)),
      React.createElement("span", { style: { margin: "0 8px", color: "rgba(255,255,255,0.20)" } }, "+"),
      React.createElement("span", { style: { color: "rgba(251,191,36,0.80)" } }, "INV: "),
      React.createElement("span", null, fmt$$(invoiced)),
    )
  );
}

// ── MAIN SLIDE ─────────────────────────────────────────────────────────────────

export default function SlideSix() {
  const [kpis,     setKpis]     = useState(null);
  const [cashFlow, setCashFlow] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [bills,    setBills]    = useState([]);

  useEffect(() => {
    async function load() {
      async function fetchAll(tableId) {
        let records = [], offset;
        do {
          const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${tableId}?pageSize=100${offset ? `&offset=${offset}` : ""}`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
          const json = await res.json();
          records = records.concat(json.records || []);
          offset = json.offset;
        } while (offset);
        return records;
      }

      const statusOrder = { overdue: 0, soon: 1, ok: 2 };
      const byDue = (a, b) =>
        statusOrder[a.status] !== statusOrder[b.status]
          ? statusOrder[a.status] - statusOrder[b.status]
          : a.due - b.due;

      const [billRecs, invRecs] = await Promise.all([
        fetchAll(BILLS_TABLE),
        fetchAll(INVOICES_TABLE),
      ]);

      const parsedBills = billRecs
        .filter(r => r.fields["Due Date"])
        .map(r => {
          const due = new Date(r.fields["Due Date"]);
          return { vendor: r.fields.Supplier, amount: r.fields.Amount ?? 0, due, status: computeStatus(due) };
        });

      const parsedInvoices = invRecs
        .filter(r => r.fields["Due Date"])
        .map(r => {
          const due = new Date(r.fields["Due Date"]);
          return { client: r.fields.Customer, amount: r.fields.Amount ?? 0, due, status: computeStatus(due) };
        });

      setBills(groupByDay(parsedBills, "vendor").sort(byDue).slice(0, 10));
      setInvoices(groupByDay(parsedInvoices, "client").sort(byDue).slice(0, 10));
      setKpis(buildKpis(parsedInvoices, parsedBills));
      setCashFlow(buildCashFlow(parsedInvoices, parsedBills));
    }

    load();
    const interval = setInterval(load, 300000);
    return () => clearInterval(interval);
  }, []);

  if (!kpis) return React.createElement("div", {
    style: { minHeight: "100vh", background: "#020617", color: "white", padding: "56px", display: "flex", alignItems: "center" },
  }, "Loading...");

  const forecasted = SALES_PLACEHOLDER.openOrdersValue + SALES_PLACEHOLDER.invoicedThisMonth;

  return React.createElement("div", {
    style: {
      minHeight: "100vh",
      background: "#020617",
      padding: "56px",
      color: "white",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
    }
  },

    // ── TITLE
    React.createElement("h1", {
      style: { margin: "0 0 48px 0", fontSize: "56px", fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1 }
    }, "Financial Dashboard"),

    // ── KPI STRIP
    React.createElement("div", {
      style: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 16 }
    },
      React.createElement(KpiCard, {
        label: "Total AR",
        value: fmt$$(kpis.totalAR),
        sub: "Outstanding receivables",
        accentColor: "#38bdf8",
      }),
      React.createElement(KpiCard, {
        label: "Total AP",
        value: fmt$$(kpis.totalAP),
        sub: "Outstanding payables",
        accentColor: "#f87171",
      }),
      React.createElement(KpiCard, {
        label: "Overdue",
        value: fmt$$(kpis.overdueAmount),
        sub: `${kpis.overdueCount} invoice${kpis.overdueCount !== 1 ? "s" : ""} require attention`,
        accentColor: "#fb923c",
      }),
      React.createElement(KpiCard, {
        label: "Next 7 Days",
        value: fmt$$(kpis.next7DaysAmount),
        sub: `${kpis.next7DaysCount} payments due`,
        accentColor: "#fbbf24",
      }),
      React.createElement(SalesKpiCard, {
        forecasted,
        openOrders: SALES_PLACEHOLDER.openOrdersValue,
        invoiced: SALES_PLACEHOLDER.invoicedThisMonth,
      }),
    ),

    // ── CASH FLOW CHART
    React.createElement("div", { style: card },
      React.createElement("div", { style: { ...cardHeader, display: "flex", justifyContent: "space-between", alignItems: "center" } },
        "6-Week Cash Flow Forecast",
        React.createElement("div", { style: { display: "flex", gap: 20 } },
          [
            { color: "rgba(56,189,248,0.7)", label: "Inflows" },
            { color: "rgba(239,68,68,0.7)",  label: "Outflows" },
            { color: "#34d399",               label: "Running Balance" },
          ].map(({ color, label }) =>
            React.createElement("div", { key: label, style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "rgba(255,255,255,0.40)" } },
              React.createElement("div", { style: { width: 10, height: 10, borderRadius: 2, background: color } }),
              label,
            )
          )
        )
      ),
      React.createElement("div", { style: { padding: "20px 24px 8px" } },
        React.createElement(CashFlowChart, { data: cashFlow })
      )
    ),

    // ── TABLES
    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1 } },
      React.createElement(FinanceTable, { title: "Invoices Due", rows: invoices, nameKey: "client" }),
      React.createElement(FinanceTable, { title: "Bills Due",    rows: bills,    nameKey: "vendor" }),
    ),

  );
}