const { useEffect, useState } = React;

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
  if (rank === 0) return { icon: "🏆", color: "#fde047", label: "Gold" };
  if (rank === 1) return { icon: "🥈", color: "#cbd5e1", label: "Silver" };
  if (rank === 2) return { icon: "🥉", color: "#d97706", label: "Bronze" };
  return null;
}

function Gauge({ value, color }) {
  const pct = Math.max(0, Math.min(100, value));
  const degrees = pct * 1.8;

  return React.createElement(
    "div",
    {
      style: {
        width: "140px",
        height: "70px",
        overflow: "hidden",
        flexShrink: 0,
      },
    },
    React.createElement(
      "div",
      {
        style: {
          width: "140px",
          height: "140px",
          borderRadius: "50%",
          background: `conic-gradient(from 270deg, ${color} 0deg ${degrees}deg, rgba(255,255,255,0.12) ${degrees}deg 180deg, transparent 180deg 360deg)`,
          position: "relative",
        },
      },
      React.createElement("div", {
        style: {
          position: "absolute",
          inset: "18px",
          borderRadius: "50%",
          background: "#020617",
        },
      })
    )
  );
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

      const rawKpi = entries[entries.length - 1]?.value || 0;
      const kpi = formatKpiPercent(rawKpi);

      return { person, kpi, entries };
    })
    .sort((a, b) => b.kpi - a.kpi);

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
      "Sales Team Performance"
    ),
    React.createElement(
      "div",
      {
        style: {
          margin: "0 auto",
          maxWidth: "1800px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(520px, 1fr))",
          gap: "32px",
        },
      },
      peopleData.map((p, index) => {
        const displayPct = Math.max(0, p.kpi);
        const gaugePct = Math.min(100, displayPct);
        const color = getColor(displayPct);
        const award = showAwards ? getAward(index) : null;

        return React.createElement(
          "div",
          {
            key: p.person,
            style: {
              position: "relative",
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              padding: "32px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              backdropFilter: "blur(12px)",
            },
          },
          award &&
            React.createElement(
              "div",
              {
                title: `${award.label} place`,
                style: {
                  position: "absolute",
                  right: "20px",
                  top: "16px",
                  fontSize: "34px",
                  color: award.color,
                },
              },
              award.icon
            ),
          React.createElement(
            "div",
            {
              style: {
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "24px",
              },
            },
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "18px",
                },
              },
              React.createElement(
                "div",
                {
                  style: {
                    height: "88px",
                    width: "88px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "999px",
                    border: "2px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.05)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: "rgba(255,255,255,0.35)",
                    boxShadow: "inset 0 2px 8px rgba(255,255,255,0.06)",
                    flexShrink: 0,
                  },
                },
                "Photo"
              ),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: "38px",
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.92)",
                    lineHeight: 1.05,
                  },
                },
                p.person
              )
            ),
            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "16px",
                },
              },
              React.createElement(Gauge, {
                value: gaugePct,
                color,
              }),
              React.createElement(
                "div",
                {
                  style: {
                    fontSize: "64px",
                    fontWeight: 700,
                    letterSpacing: "-0.05em",
                    lineHeight: 1,
                    transform: "translateY(4px)",
                  },
                },
                `${displayPct}%`
              )
            )
          ),
          React.createElement(
            "div",
            {
              style: {
                marginTop: "28px",
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "22px",
              },
            },
            p.entries.slice(0, -1).map((e) =>
              React.createElement(
                "div",
                { key: e.label },
                React.createElement(
                  "div",
                  {
                    style: {
                      marginBottom: "8px",
                      fontSize: "15px",
                      color: "rgba(255,255,255,0.50)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  },
                  e.label
                ),
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: "42px",
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    },
                  },
                  e.value
                )
              )
            )
          )
        );
      })
    )
  );
}