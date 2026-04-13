const { useEffect, useState } = React;
const {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} = Recharts;

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1svBS108VVHNNJvJxftx42gF-zoivnaHrs-FtvRj8oG4/gviz/tq?tqx=out:json&gid=361756726";

function parseGViz(text) {
  const jsonText = text.match(/setResponse\((.*)\)/s)?.[1];
  if (!jsonText) return [];
  const data = JSON.parse(jsonText);

  const headers = data.table.cols.map((col, i) =>
    col.label || (i === 0 ? "Label" : col.id)
  );

  return data.table.rows.map((row) => {
    const values = row.c.map((c) => (c ? c.v : null));
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

function getColor(kpi) {
  if (kpi >= 150) return "#b9f2ff";
  if (kpi >= 125) return "#fbbf24";
  if (kpi < 40) return "#f87171";
  if (kpi < 70) return "#38bdf8";
  return "#22c55e";
}

function formatKpiPercent(value) {
  const pct = value <= 1 ? value * 100 : value;
  return Math.round(pct);
}

function isLastWorkingDayOfMonth(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const lastDay = new Date(year, month + 1, 0);

  while (lastDay.getDay() === 0 || lastDay.getDay() === 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }

  return date.toDateString() === lastDay.toDateString();
}

function getAward(rank) {
  if (rank === 0) return "🏆";
  if (rank === 1) return "🥈";
  if (rank === 2) return "🥉";
  return null;
}

export default function SlideTwo() {
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

  if (!data.length) {
    return React.createElement("div", { style: { color: "white", padding: 20 } }, "Loading...");
  }

  const headers = Object.keys(data[0]);
  const labelKey = headers[0];
  const people = headers.slice(1);
  const showAwards = isLastWorkingDayOfMonth();

  const peopleData = people
    .map((person) => {
      const entries = data.map((row) => ({
        label: String(row[labelKey]),
        value: Number(row[person]),
      }));

      const rawKpi = entries.at(-1)?.value || 0;
      const kpi = formatKpiPercent(rawKpi);

      return { person, kpi, entries };
    })
    .sort((a, b) => b.kpi - a.kpi);

  return React.createElement(
    "div",
    {
      style: {
        minHeight: "100vh",
        padding: "64px",
        color: "white",
        background: "#020617",
      },
    },

    React.createElement(
      "h1",
      { style: { fontSize: "56px", marginBottom: "48px" } },
      "Sales Team Performance"
    ),

    React.createElement(
      "div",
      {
        style: {
          display: "grid",
          gap: "32px",
          gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))",
        },
      },

      peopleData.map((p, index) => {
        const pct = Math.max(0, p.kpi);
        const gaugePct = Math.min(100, pct);
        const color = getColor(pct);
        const award = showAwards ? getAward(index) : null;

        return React.createElement(
          "div",
          {
            key: p.person,
            style: {
              borderRadius: "32px",
              padding: "32px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              position: "relative",
            },
          },

          award &&
            React.createElement(
              "div",
              {
                style: {
                  position: "absolute",
                  right: 16,
                  top: 16,
                  fontSize: "32px",
                },
              },
              award
            ),

          React.createElement(
            "div",
            { style: { fontSize: "32px", marginBottom: "16px" } },
            p.person
          ),

          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: 20 } },

            React.createElement(
              "div",
              { style: { width: 150, height: 100 } },
              React.createElement(
                ResponsiveContainer,
                { width: "100%", height: "100%" },
                React.createElement(
                  RadialBarChart,
                  {
                    data: [{ value: gaugePct }],
                    innerRadius: "70%",
                    outerRadius: "100%",
                    startAngle: 180,
                    endAngle: 0,
                  },
                  React.createElement(PolarAngleAxis, {
                    type: "number",
                    domain: [0, 100],
                    tick: false,
                  }),
                  React.createElement(RadialBar, {
                    dataKey: "value",
                    fill: color,
                  })
                )
              )
            ),

            React.createElement(
              "div",
              { style: { fontSize: "48px", fontWeight: "bold" } },
              pct + "%"
            )
          )
        );
      })
    )
  );
}