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
      { style: { padding: 24, color: "white" } },
      "Loading..."
    );
  }

  const metrics = Object.keys(thisMonth).filter((k) => k !== "Period");

  return React.createElement(
    "div",
    {
      style: {
        minHeight: "100vh",
        padding: "48px",
        color: "white",
        background: "#020617",
      },
    },
    React.createElement(
      "h1",
      {
        style: {
          fontSize: "48px",
          marginBottom: "48px",
        },
      },
      "Executive Overview"
    ),

    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gap: "24px",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
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
              borderRadius: "24px",
              padding: "32px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            },
          },
          React.createElement(
            "div",
            { style: { opacity: 0.6, marginBottom: "12px" } },
            key
          ),
          React.createElement(
            "div",
            { style: { fontSize: "48px", fontWeight: "bold" } },
            formatValue(key, value)
          ),
          React.createElement(
            "div",
            {
              style: {
                marginTop: "16px",
                padding: "8px 12px",
                borderRadius: "999px",
                display: "inline-block",
                background: isUp
                  ? "rgba(16,185,129,0.2)"
                  : "rgba(239,68,68,0.2)",
                color: isUp ? "#34d399" : "#f87171",
              },
            },
            `${isUp ? "▲" : "▼"} ${formatValue(key, Math.abs(change))}`
          )
        );
      })
    )
  );
}