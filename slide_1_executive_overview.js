const { useEffect, useState } = React;

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1svBS108VVHNNJvJxftx42gF-zoivnaHrs-FtvRj8oG4/gviz/tq?tqx=out:json";

function parseGViz(text) {
  const jsonText = text.match(/setResponse\((.*)\)/s)?.[1];
  if (!jsonText) return [];
  const data = JSON.parse(jsonText);

  const headers = data.table.cols.map((col, i) =>
    col.label || (i === 0 ? "Period" : col.id)
  );

  return data.table.rows.map((row) => {
    const values = row.c.map((c) => (c ? c.v : null));
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

function formatValue(key, value) {
  const isCurrency = key.toLowerCase().includes("value");

  if (isCurrency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return Number(value).toLocaleString();
}

export default function SlideOne() {
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

  const thisMonth = data.find((d) => d.Period === "This Month");
  const lastMonth = data.find((d) => d.Period === "Last Month");

  if (!thisMonth || !lastMonth) {
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
        },
      },
      "Loading..."
    );
  }

  const metrics = Object.keys(thisMonth).filter((k) => k !== "Period");

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
      "Executive Overview"
    ),
    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "28px",
        },
      },
      metrics.map((key) => {
        const value = Number(thisMonth[key]);
        const prev = Number(lastMonth[key]);
        const change = value - prev;
        const isUp = change >= 0;

        return React.createElement(
          "div",
          {
            key,
            style: {
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              padding: "32px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              backdropFilter: "blur(12px)",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                marginBottom: "14px",
                fontSize: "18px",
                color: "rgba(255,255,255,0.60)",
              },
            },
            key
          ),
          React.createElement(
            "div",
            {
              style: {
                marginBottom: "20px",
                fontSize: "56px",
                fontWeight: 700,
                letterSpacing: "-0.04em",
                lineHeight: 1,
              },
            },
            formatValue(key, value)
          ),
          React.createElement(
            "div",
            {
              style: {
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                borderRadius: "999px",
                padding: "10px 14px",
                fontSize: "18px",
                background: isUp ? "rgba(16,185,129,0.20)" : "rgba(239,68,68,0.20)",
                color: isUp ? "#34d399" : "#f87171",
              },
            },
            React.createElement(
              "span",
              { style: { fontSize: "22px", lineHeight: 1 } },
              isUp ? "▲" : "▼"
            ),
            formatValue(key, Math.abs(change))
          )
        );
      })
    )
  );
}