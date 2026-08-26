import StatusBadge from "./toolForms/shared/StatusBadge";

function InfoBlock({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "8px",
        background: "var(--surface)",
      }}
    >
      <div
        style={{
          color: "var(--subtle)",
          fontSize: "12px",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "var(--text)",
          fontSize: "13px",
          wordBreak: "break-word",
        }}
      >
        {value || "Not found"}
      </div>
    </div>
  );
}

function FindingRow({ label, ok }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "10px",
        padding: "6px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <span
        style={{
          color: "var(--text)",
          fontSize: "13px",
        }}
      >
        {label}
      </span>

      <StatusBadge
        label={ok ? "OK" : "Missing"}
        status={ok ? "success" : "error"}
      />
    </div>
  );
}

function ScoreHeader({ score, maxScore, label }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "12px",
      }}
    >
      <div
        style={{
          color: "var(--text)",
          fontSize: "15px",
          fontWeight: "600",
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "var(--subtle)",
          fontSize: "13px",
        }}
      >
        Score: {score}/{maxScore}
      </div>
    </div>
  );
}

function DnsAnalysisResult({ data }) {
  if (data.view === "message") {
    return (
      <div
        style={{
          color: "var(--subtle)",
        }}
      >
        {data.message}
      </div>
    );
  }

  if (data.view === "dkim") {
    return (
      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >
        <div
          style={{
            color: "var(--text)",
            fontSize: "15px",
            fontWeight: "600",
          }}
        >
          DKIM analysis for {data.domain}
        </div>

        {data.results.map((entry) => (
          <div
            key={entry.selector}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "10px",
              background: "var(--surface)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
              }}
            >
              <span
                style={{
                  color: "var(--text)",
                  fontWeight: "600",
                }}
              >
                {entry.selector}
              </span>

              <StatusBadge
                label={entry.found ? "Found" : "Not found"}
                status={entry.found ? "success" : "error"}
              />
            </div>

            {entry.found && (
              <>
                <div
                  style={{
                    color: "var(--subtle)",
                    fontSize: "12px",
                    marginBottom: "6px",
                  }}
                >
                  {entry.hasPublicKey ? "Public key found" : "No public key"}
                </div>

                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    color: "var(--text)",
                    fontSize: "12px",
                  }}
                >
                  {entry.record}
                </pre>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (data.view === "m365health" || data.view === "healthcheck") {
    return (
      <div>
        <ScoreHeader
          score={data.score}
          maxScore={data.maxScore}
          label={
            data.view === "m365health"
              ? `Microsoft 365 DNS Health Check for ${data.domain}`
              : `DNS Health Check for ${data.domain}`
          }
        />

        <div>
          {data.findings.map((finding) => (
            <FindingRow
              key={finding.label}
              label={finding.label}
              ok={finding.ok}
            />
          ))}
        </div>
      </div>
    );
  }

  if (data.view === "dmarc") {
    return (
      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >
        <div
          style={{
            color: "var(--text)",
            fontSize: "15px",
            fontWeight: "600",
          }}
        >
          DMARC analysis for {data.domain}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
          }}
        >
          <InfoBlock
            label="Policy"
            value={
              data.policy
                ? data.policy.charAt(0).toUpperCase() + data.policy.slice(1)
                : "No policy found"
            }
          />

          <InfoBlock label="Percentage" value={`${data.pct}%`} />

          <InfoBlock
            label="Aggregate reporting (RUA)"
            value={data.hasRua ? "Present" : "Not set"}
          />

          <InfoBlock
            label="Forensic reporting (RUF)"
            value={data.hasRuf ? "Present" : "Not set"}
          />
        </div>

        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            color: "var(--text)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "13px",
          }}
        >
          {data.raw}
        </pre>
      </div>
    );
  }

  if (data.view === "spf") {
    return (
      <div
        style={{
          display: "grid",
          gap: "10px",
        }}
      >
        <div
          style={{
            color: "var(--text)",
            fontSize: "15px",
            fontWeight: "600",
          }}
        >
          SPF analysis for {data.domain}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "10px",
          }}
        >
          <InfoBlock
            label="Fail policy"
            value={
              data.failPolicy === "hard"
                ? "Hard Fail (-all)"
                : data.failPolicy === "soft"
                  ? "Soft Fail (~all)"
                  : "No fail policy found"
            }
          />

          <InfoBlock
            label="Microsoft 365 include"
            value={data.hasOffice365 ? "Found" : "Not found"}
          />

          <InfoBlock
            label="MailChannels"
            value={data.hasMailChannels ? "Found" : "Not found"}
          />

          <InfoBlock label="Include statements" value={data.includeCount} />

          <InfoBlock label="Explicit IP addresses" value={data.ipCount} />
        </div>

        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            color: "var(--text)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "10px",
            fontSize: "13px",
          }}
        >
          {data.raw}
        </pre>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gap: "10px",
      }}
    >
      <div
        style={{
          color: "var(--text)",
          fontSize: "15px",
          fontWeight: "600",
        }}
      >
        {data.recordType} records for {data.domain}
      </div>

      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          color: "var(--text)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "10px",
          fontSize: "13px",
        }}
      >
        {data.records.join("\n\n")}
      </pre>
    </div>
  );
}

export default function ToolResultView({ result, compactMode }) {
  if (result?.type === "dnsAnalysis") {
    return <DnsAnalysisResult data={result} />;
  }

  return (
    <pre
      style={{
        whiteSpace: "pre-wrap",
        color: "var(--text)",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: compactMode ? "8px" : "12px",
        margin: 0,
        fontSize: compactMode ? "12px" : undefined,
      }}
    >
      {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
    </pre>
  );
}
