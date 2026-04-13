const { useEffect, useState } = React;

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1svBS108VVHNNJvJxftx42gF-zoivnaHrs-FtvRj8oG4/gviz/tq?tqx=out:json&gid=2074888451";

function parseGViz(text) {
  const jsonText = text.match(/setResponse\((.*)\)/s)?.[1];
  if (!jsonText) return [];
  const data = JSON.parse(jsonText);

  const headers = data.table.cols.map((col, i) =>
    col.label || (i === 0 ? "Stage" : col.id)
  );

  return data.table.rows.map((row) => {
    const values = row.c.map((c) => (c ? c.v : null));
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}

function formatCurrencyCompact(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(value)
    .replace("K", "k")
    .replace("M", "m");
}

function formatCurrencyFull(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value) {
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export default function SlideThree() {
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
          boxSizing: "border-box",
        },
      },
      "Loading..."
    );
  }

  const headers = Object.keys(data[0]);
  const stageKey = headers[0];
  const dealsKey = headers[1];
  const valueKey = headers[2];
  const ageKey = headers[3];

  const stageRows = data.filter(
    (r) => r[stageKey] && !String(r[stageKey]).toLowerCase().includes("average")
  );

  const summaryRows = data.filter((r) =>
    String(r[stageKey] || "").toLowerCase().includes("average")
  );

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
      "Pipeline Overview"
    ),

    React.createElement(
      "div",
      {
        style: {
          margin: "0 auto 72px auto",
          maxWidth: "1800px",
        },
      },
      React.createElement(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(stageRows.length, 1)}, minmax(0, 1fr))`,
            gap: "24px",
            alignItems: "stretch",
          },
        },
        stageRows.map((row, i) => {
          const deals = Number(row[dealsKey] ?? 0);
          const value = Number(row[valueKey] ?? 0);
          const age = row[ageKey];

          return React.createElement(
            "div",
            {
              key: i,
              style: {
                position: "relative",
                minHeight: "300px",
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
                  marginBottom: "24px",
                  minHeight: "4rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  fontSize: "28px",
                  fontWeight: 600,
                  letterSpacing: "-0.03em",
                  color: "white",
                  lineHeight: 1.1,
                },
              },
              row[stageKey]
            ),

            React.createElement(
              "div",
              {
                style: {
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                  textAlign: "center",
                },
              },

              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  {
                    style: {
                      marginBottom: "8px",
                      fontSize: "18px",
                      color: "rgba(255,255,255,0.60)",
                    },
                  },
                  "Deals"
                ),
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: "44px",
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    },
                  },
                  deals || "—"
                )
              ),

              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  {
                    style: {
                      marginBottom: "8px",
                      fontSize: "18px",
                      color: "rgba(255,255,255,0.60)",
                    },
                  },
                  "Value"
                ),
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: "52px",
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    },
                  },
                  value ? formatCurrencyCompact(value) : "—"
                )
              ),

              React.createElement(
                "div",
                null,
                React.createElement(
                  "div",
                  {
                    style: {
                      marginBottom: "8px",
                      fontSize: "18px",
                      color: "rgba(255,255,255,0.60)",
                    },
                  },
                  "Average Age"
                ),
                React.createElement(
                  "div",
                  {
                    style: {
                      fontSize: "40px",
                      fontWeight: 700,
                      letterSpacing: "-0.04em",
                      lineHeight: 1,
                    },
                  },
                  age !== null && age !== undefined && age !== ""
                    ? React.createElement(
                        React.Fragment,
                        null,
                        React.createElement("span", null, formatNumber(Number(age))),
                        React.createElement(
                          "span",
                          {
                            style: {
                              marginLeft: "6px",
                              fontSize: "14px",
                              fontWeight: 400,
                              color: "rgba(255,255,255,0.35)",
                            },
                          },
                          "months"
                        )
                      )
                    : "—"
                )
              )
            ),

            i < stageRows.length - 1 &&
              React.createElement(
                "div",
                {
                  style: {
                    position: "absolute",
                    right: "-16px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                    fontSize: "42px",
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.45)",
                    pointerEvents: "none",
                  },
                },
                "→"
              )
          );
        })
      )
    ),

    React.createElement(
      "div",
      {
        style: {
          margin: "0 auto",
          maxWidth: "900px",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "28px",
        },
      },
      summaryRows.map((row, i) => {
        const rawLabel = String(row[stageKey] ?? "");
        const label = rawLabel.toLowerCase();
        const raw = Object.values(row).find((v) => typeof v === "number");

        const isAge =
          label.includes("age") && !label.includes("size") && !label.includes("value");
        const isSize = label.includes("size") || label.includes("value");

        let display = "—";

        if (raw !== undefined) {
          if (isAge) {
            display = null;
          } else if (isSize) {
            display = formatCurrencyFull(raw);
          } else {
            display = formatNumber(raw);
          }
        }

        return React.createElement(
          "div",
          {
            key: i,
            style: {
              borderRadius: "28px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.05)",
              padding: "32px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              backdropFilter: "blur(12px)",
            },
          },
          React.createElement(
            "div",
            {
              style: {
                marginBottom: "14px",
                fontSize: "22px",
                color: "rgba(255,255,255,0.70)",
              },
            },
            rawLabel
          ),
          React.createElement(
            "div",
            {
              style: {
                fontSize: "48px",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-0.04em",
                lineHeight: 1,
              },
            },
            raw !== undefined
              ? isAge
                ? React.createElement(
                    React.Fragment,
                    null,
                    React.createElement("span", null, formatNumber(raw)),
                    React.createElement(
                      "span",
                      {
                        style: {
                          marginLeft: "6px",
                          fontSize: "14px",
                          fontWeight: 400,
                          color: "rgba(255,255,255,0.35)",
                        },
                      },
                      "months"
                    )
                  )
                : display
              : "—"
          )
        );
      })
    )
  );
}