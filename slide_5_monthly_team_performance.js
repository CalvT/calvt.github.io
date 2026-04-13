const { useEffect, useMemo, useState } = React;

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1svBS108VVHNNJvJxftx42gF-zoivnaHrs-FtvRj8oG4/gviz/tq?tqx=out:json&gid=399068558";

const MONTHLY_TARGETS = {
  0: 125000,
  1: 135000,
  2: 145000,
  3: 165000,
  4: 180000,
  5: 195000,
  6: 220000,
  7: 255000,
  8: 270000,
  9: 280000,
  10: 280000,
  11: 250000,
};

function parseGViz(text) {
  try {
    const match = text.match(/setResponse\((.*)\)/s);
    const jsonText = match?.[1];
    if (!jsonText) return [];

    const parsed = JSON.parse(jsonText);
    const cols = parsed?.table?.cols || [];
    const rows = parsed?.table?.rows || [];

    const headers = cols.map((c, i) => c?.label || c?.id || `Column ${i + 1}`);

    return rows.map((row) => {
      const values = (row?.c || []).map((c) => (c ? c.v : null));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? null]));
    });
  } catch {
    return [];
  }
}

function cleanLabel(v) {
  return String(v).replace(/^\W+/, "").replace(/^\d+\s*/, "").trim();
}

function getType(label) {
  const l = String(label).toLowerCase();
  if (l.includes("kpi") || l.includes("%") || l.includes("gp")) return "percent";
  if (l.includes("sales") || l.includes("value") || l.includes("growth")) return "currency";
  return "number";
}

function formatValue(value, type) {
  if (type === "currency") {
    const abs = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(Math.abs(value));
    return value < 0 ? `-${abs}` : abs;
  }

  if (type === "percent") {
    const pct = value <= 1 ? value * 100 : value;
    return `${Math.round(pct)}%`;
  }

  return Number(value).toLocaleString();
}

function getPercentValue(value) {
  return value <= 1 ? value * 100 : value;
}

function getKpiColor(value) {
  const pct = getPercentValue(value);
  if (pct >= 150) return "#b9f2ff";
  if (pct >= 125) return "#fde047";
  if (pct >= 100) return "#34d399";
  if (pct >= 70) return "#60a5fa";
  if (pct < 40) return "#f87171";
  return "#60a5fa";
}

function getSalesColor(value) {
  const target = MONTHLY_TARGETS[new Date().getMonth()];
  if (target && value >= target) return "#34d399";
  if (value >= 100000) return "#60a5fa";
  return "#f87171";
}

function getGpColor(value) {
  const pct = getPercentValue(value);
  if (pct > 35) return "#34d399";
  if (pct >= 30) return "#60a5fa";
  return "#f87171";
}

function getPipelineColor(value) {
  return value < 0 ? "#f87171" : "#ffffff";
}

function getValueColor(card) {
  const label = card.label.toLowerCase();
  if (label.includes("kpi")) return getKpiColor(card.value);
  if (label.includes("monthly sales")) return getSalesColor(card.value);
  if (label.includes("gp")) return getGpColor(card.value);
  if (label.includes("pipeline growth")) return getPipelineColor(card.value);
  return "#ffffff";
}

function getTrendArrow(card) {
  const label = card.label.toLowerCase();
  if (!label.includes("pipeline growth")) return null;
  if (card.value > 0) return "↑";
  if (card.value < 0) return "↓";
  return null;
}

function getTrendColor(card) {
  if (card.value > 0) return "#34d399";
  if (card.value < 0) return "#f87171";
  return "rgba(255,255,255,0.4)";
}

function buildCards(rows) {
  if (!rows.length) return [];

  const headers = Object.keys(rows[0] || {});

  if (rows.length >= 2) {
    const labelRow = rows[0];
    const valueRow = rows[1];

    return headers
      .map((h, i) => {
        const label = cleanLabel(labelRow[h]);
        if (!label) return null;
        return {
          id: `card-${i}`,
          label,
          value: Number(valueRow[h] ?? 0),
          type: getType(label),
        };
      })
      .filter(Boolean);
  }

  return headers
    .map((h, i) => {
      const label = cleanLabel(h);
      if (!label) return null;
      return {
        id: `card-${i}`,
        label,
        value: Number(rows[0][h] ?? 0),
        type: getType(label),
      };
    })
    .filter(Boolean);
}

export default function SlideFive() {
  const [data, setData] = useState([]);

  useEffect(() => {
    async function load() {
      const res = await fetch(SHEET_URL);
      const text = await res.text();
      setData(parseGViz(text));
    }

    load();
    const interval = setInterval(load, 300000);
    return () => clearInterval(interval);
  }, []);

  const cards = useMemo(() => buildCards(data), [data]);
  const currentMonthTarget = MONTHLY_TARGETS[new Date().getMonth()];

  if (!cards.length) {
    return React.createElement(
      "div",
      {
        style: {
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          padding: "24px",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
        },
      },
      "Loading..."
    );
  }

  return React.createElement(
    "div",
    {
      style: {
        minHeight: "100vh",
        background: "#020617",
        padding: "48px 48px 64px",
        color: "white",
        boxSizing: "border-box",
      },
    },
    React.createElement(
      "h1",
      {
        style: {
          margin: "0 0 48px 0",
          fontSize: "56px",
          fontWeight: 600,
          letterSpacing: "-0.03em",
        },
      },
      "Monthly Team Performance"
    ),
    React.createElement(
      "div",
      {
        style: {
          margin: "0 auto",
          maxWidth: "1600px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "32px",
        },
      },
      cards.map((card) => {
        const arrow = getTrendArrow(card);

        return React.createElement(
          "div",
          {
            key: card.id,
            style: {
              minHeight: "220px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              padding: "32px 40px",
              boxSizing: "border-box",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              backdropFilter: "blur(12px)",
              gap: "24px",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                fontSize: "36px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.8)",
                lineHeight: 1.15,
              },
            },
            card.label
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "8px",
                flexShrink: 0,
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                },
              },
              arrow &&
                React.createElement(
                  "span",
                  {
                    style: {
                      fontSize: "52px",
                      lineHeight: 1,
                      color: getTrendColor(card),
                    },
                  },
                  arrow
                ),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: "56px",
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                    color: getValueColor(card),
                  },
                },
                formatValue(card.value, card.type)
              )
            ),
            card.label.toLowerCase().includes("monthly sales") &&
              currentMonthTarget &&
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: "18px",
                    color: "rgba(255,255,255,0.4)",
                  },
                },
                `Target: ${formatValue(currentMonthTarget, "currency")}`
              )
          )
        );
      })
    )
  );
}