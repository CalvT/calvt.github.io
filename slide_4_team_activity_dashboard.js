const { useEffect, useMemo, useState } = React;

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1svBS108VVHNNJvJxftx42gF-zoivnaHrs-FtvRj8oG4/gviz/tq?tqx=out:json&gid=1557164005";

function parseGViz(text) {
  const match = text.match(/setResponse\((.*)\)/s);
  const jsonText = match?.[1];
  if (!jsonText) return [];

  const parsed = JSON.parse(jsonText);
  const cols = Array.isArray(parsed?.table?.cols) ? parsed.table.cols : [];
  const rows = Array.isArray(parsed?.table?.rows) ? parsed.table.rows : [];

  const headers = cols.map((col, i) => {
    const label = typeof col?.label === "string" ? col.label.trim() : "";
    const id = typeof col?.id === "string" ? col.id.trim() : "";
    return label || id || (i === 0 ? "Metric" : `Column ${i + 1}`);
  });

  return rows.map((row) => {
    const cells = Array.isArray(row?.c) ? row.c : [];
    const values = cells.map((cell) => (cell ? cell.v : null));
    return Object.fromEntries(headers.map((header, i) => [header, values[i] ?? null]));
  });
}

function isTitleRow(row) {
  if (!row) return false;
  const populated = Object.values(row).filter((value) => value !== null && value !== "");
  return populated.length === 1;
}

function cleanMetricLabel(value) {
  return String(value)
    .replace(/^\W+/, "")
    .replace(/^\d+\s*/, "")
    .replace(/^team\s+/i, "")
    .replace(/\bops\b/gi, "Opportunities")
    .trim();
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function isCurrencyLabel(label) {
  const lower = String(label).toLowerCase();
  return lower.includes("value") || lower.includes("revenue") || lower.includes("amount");
}

function buildCards(rows) {
  if (!rows.length) return [];

  const headers = Object.keys(rows[0]);
  if (!headers.length) return [];

  if (rows.length === 1) {
    const row = rows[0];
    return headers.map((header, index) => ({
      id: `single-${index}`,
      label: cleanMetricLabel(header),
      value: row[header],
      isCurrency: isCurrencyLabel(header),
    }));
  }

  const labelKey = headers[0];
  const valueKeys = headers.slice(1);

  return rows.flatMap((row, rowIndex) => {
    const baseLabel = cleanMetricLabel(String(row[labelKey] ?? ""));
    return valueKeys.map((column, columnIndex) => ({
      id: `${rowIndex}-${columnIndex}`,
      label: `${baseLabel} ${cleanMetricLabel(column)}`.trim(),
      value: row[column],
      isCurrency: isCurrencyLabel(column) || isCurrencyLabel(baseLabel),
    }));
  });
}

function renderValue(card) {
  if (card.value === null || card.value === "") return "—";
  const numeric = Number(card.value);
  if (!Number.isNaN(numeric)) {
    return card.isCurrency ? formatCurrency(numeric) : formatNumber(numeric);
  }
  return String(card.value);
}

export default function SlideFour() {
  const [data, setData] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const res = await fetch(SHEET_URL);
      const text = await res.text();
      if (isMounted) setData(parseGViz(text));
    }

    load();
    const interval = setInterval(load, 300000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const cleanedData = useMemo(() => {
    if (!data.length) return [];
    return isTitleRow(data[0]) ? data.slice(1) : data;
  }, [data]);

  const cards = useMemo(() => buildCards(cleanedData), [cleanedData]);

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
        padding: "56px",
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
      "Team Activity Dashboard"
    ),
    React.createElement(
      "div",
      {
        style: {
          margin: "0 auto",
          maxWidth: "1900px",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "24px",
        },
      },
      cards.map((card) =>
        React.createElement(
          "div",
          {
            key: card.id,
            style: {
              minHeight: "220px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              padding: "28px",
              boxSizing: "border-box",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              backdropFilter: "blur(12px)",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                fontSize: "24px",
                lineHeight: 1.2,
                color: "rgba(255,255,255,0.70)",
              },
            },
            card.label
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: "56px",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                wordBreak: "break-word",
              },
            },
            renderValue(card)
          )
        )
      )
    )
  );
}