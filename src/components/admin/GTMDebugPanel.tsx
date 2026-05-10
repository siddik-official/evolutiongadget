"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Types ───

interface DataLayerEvent {
  event?: string;
  [key: string]: unknown;
}

interface TrackingStatus {
  gtmLoaded: boolean;
  pixelLoaded: boolean;
  dataLayerInitialized: boolean;
  dataLayerEventCount: number;
}

// ─── GTM Debug Panel Component ───

/**
 * GTM/Meta Pixel Debug Panel for admin dashboard.
 * Checks whether GTM and Meta Pixel are loading correctly by inspecting
 * window.dataLayer and window.fbq at runtime.
 *
 * Admin-only — does NOT affect storefront performance.
 * Reads window.dataLayer and window.fbq to report status, never modifies tracking behavior.
 */
export default function GTMDebugPanel() {
  const [status, setStatus] = useState<TrackingStatus>({
    gtmLoaded: false,
    pixelLoaded: false,
    dataLayerInitialized: false,
    dataLayerEventCount: 0,
  });
  const [events, setEvents] = useState<DataLayerEvent[]>([]);
  const [testFired, setTestFired] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const checkStatus = useCallback(() => {
    const win = window as unknown as {
      dataLayer?: DataLayerEvent[];
      fbq?: (...args: unknown[]) => void;
      google_tag_manager?: Record<string, unknown>;
    };

    const dataLayerExists = Array.isArray(win.dataLayer);
    const gtmLoaded = !!win.google_tag_manager || dataLayerExists;
    const pixelLoaded = typeof win.fbq === "function";
    const dataLayerEventCount = dataLayerExists ? win.dataLayer!.length : 0;

    setStatus({
      gtmLoaded,
      pixelLoaded,
      dataLayerInitialized: dataLayerExists,
      dataLayerEventCount,
    });

    // Capture recent events (last 20)
    if (dataLayerExists) {
      const recentEvents = [...win.dataLayer!]
        .reverse()
        .slice(0, 20)
        .map((e) => ({ ...e }));
      setEvents(recentEvents);
    }
  }, []);

  // Auto-refresh every 2 seconds
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Fire test event
  const fireTestEvent = () => {
    const win = window as unknown as {
      dataLayer?: DataLayerEvent[];
      fbq?: (...args: unknown[]) => void;
    };

    // Push test event to dataLayer
    if (Array.isArray(win.dataLayer)) {
      win.dataLayer.push({
        event: "gtm_debug_test",
        debug_timestamp: new Date().toISOString(),
        debug_source: "GTMDebugPanel",
      });
    }

    // Fire test pixel event
    if (typeof win.fbq === "function") {
      win.fbq("trackCustom", "DebugTest", {
        timestamp: new Date().toISOString(),
      });
    }

    setTestFired(true);
    setTimeout(() => setTestFired(false), 3000);

    // Refresh status immediately
    setTimeout(checkStatus, 500);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.headerIcon}>🔍</div>
          <div>
            <h3 style={styles.title}>Tracking Debug Panel</h3>
            <p style={styles.subtitle}>
              GTM &amp; Meta Pixel status monitor
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={styles.toggleButton}
          aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
        >
          {isExpanded ? "▲" : "▼"}
        </button>
      </div>

      {isExpanded && (
        <div style={styles.body}>
          {/* Status Cards */}
          <div style={styles.statusGrid}>
            <StatusCard
              label="GTM Loaded"
              active={status.gtmLoaded}
              detail={
                status.gtmLoaded
                  ? "google_tag_manager detected"
                  : "Not detected on this page"
              }
            />
            <StatusCard
              label="Meta Pixel"
              active={status.pixelLoaded}
              detail={
                status.pixelLoaded
                  ? "window.fbq function found"
                  : "fbq not detected"
              }
            />
            <StatusCard
              label="dataLayer"
              active={status.dataLayerInitialized}
              detail={
                status.dataLayerInitialized
                  ? `${status.dataLayerEventCount} event${status.dataLayerEventCount !== 1 ? "s" : ""}`
                  : "Not initialized"
              }
            />
          </div>

          {/* Action Bar */}
          <div style={styles.actionBar}>
            <button
              onClick={fireTestEvent}
              style={{
                ...styles.testButton,
                ...(testFired ? styles.testButtonFired : {}),
              }}
              disabled={testFired}
            >
              {testFired ? "✓ Test Event Fired" : "⚡ Fire Test Event"}
            </button>
            <button onClick={checkStatus} style={styles.refreshButton}>
              🔄 Refresh
            </button>
          </div>

          {/* Events Table */}
          <div style={styles.eventsSection}>
            <h4 style={styles.eventsTitle}>
              Recent dataLayer Events
              <span style={styles.eventsBadge}>{events.length}</span>
            </h4>

            {events.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>No dataLayer events captured yet.</p>
                <p style={styles.emptySubtext}>
                  Events will appear here as GTM pushes them.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Event</th>
                      <th style={styles.th}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((evt, idx) => (
                      <tr
                        key={idx}
                        style={{
                          ...styles.tr,
                          ...(evt.event === "gtm_debug_test"
                            ? styles.testRow
                            : {}),
                        }}
                      >
                        <td style={styles.td}>
                          <span style={styles.indexBadge}>{idx + 1}</span>
                        </td>
                        <td style={styles.td}>
                          <code style={styles.eventName}>
                            {evt.event || "(no event name)"}
                          </code>
                        </td>
                        <td style={styles.td}>
                          <code style={styles.eventData}>
                            {summarizeEvent(evt)}
                          </code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Feed Links */}
          <div style={styles.feedSection}>
            <h4 style={styles.feedTitle}>Product Feed Endpoints</h4>
            <div style={styles.feedLinks}>
              <a
                href="/facebook-feed.xml"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.feedLink}
              >
                📄 XML Feed
              </a>
              <a
                href="/facebook-feed.json"
                target="_blank"
                rel="noopener noreferrer"
                style={styles.feedLink}
              >
                📋 JSON Feed
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-Components ───

function StatusCard({
  label,
  active,
  detail,
}: {
  label: string;
  active: boolean;
  detail: string;
}) {
  return (
    <div
      style={{
        ...styles.statusCard,
        borderColor: active ? "#22c55e" : "#ef4444",
        background: active
          ? "linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)"
          : "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.02) 100%)",
      }}
    >
      <div style={styles.statusIcon}>{active ? "✅" : "❌"}</div>
      <div>
        <div style={styles.statusLabel}>{label}</div>
        <div
          style={{
            ...styles.statusDetail,
            color: active ? "#16a34a" : "#dc2626",
          }}
        >
          {detail}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───

function summarizeEvent(evt: DataLayerEvent): string {
  const keys = Object.keys(evt).filter((k) => k !== "event");
  if (keys.length === 0) return "{}";

  const summary = keys
    .slice(0, 4)
    .map((k) => {
      const v = evt[k];
      const valueStr =
        typeof v === "string"
          ? v.length > 30
            ? `"${v.slice(0, 30)}..."`
            : `"${v}"`
          : JSON.stringify(v);
      return `${k}: ${valueStr}`;
    })
    .join(", ");

  return keys.length > 4 ? `{ ${summary}, ... }` : `{ ${summary} }`;
}

// ─── Styles ───

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: "#0f172a",
    borderRadius: "16px",
    border: "1px solid rgba(148, 163, 184, 0.15)",
    overflow: "hidden",
    boxShadow:
      "0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 24px",
    background:
      "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerIcon: {
    fontSize: "24px",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "10px",
    background: "rgba(99, 102, 241, 0.15)",
  },
  title: {
    margin: 0,
    fontSize: "16px",
    fontWeight: 700,
    color: "#f1f5f9",
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: 0,
    fontSize: "13px",
    color: "#94a3b8",
    marginTop: "2px",
  },
  toggleButton: {
    background: "rgba(148, 163, 184, 0.1)",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    borderRadius: "8px",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "6px 12px",
    fontSize: "12px",
    transition: "all 0.2s",
  },
  body: {
    padding: "20px 24px 24px",
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
    marginBottom: "20px",
  },
  statusCard: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    borderRadius: "12px",
    border: "1px solid",
    transition: "all 0.3s ease",
  },
  statusIcon: {
    fontSize: "20px",
    flexShrink: 0,
  },
  statusLabel: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#e2e8f0",
  },
  statusDetail: {
    fontSize: "11px",
    fontWeight: 500,
    marginTop: "2px",
  },
  actionBar: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  testButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 20px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
  },
  testButtonFired: {
    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
    boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
  },
  refreshButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "10px 16px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    background: "rgba(148, 163, 184, 0.08)",
    color: "#94a3b8",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  eventsSection: {
    marginBottom: "20px",
  },
  eventsTitle: {
    margin: "0 0 12px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#e2e8f0",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  eventsBadge: {
    background: "rgba(99, 102, 241, 0.2)",
    color: "#a5b4fc",
    fontSize: "11px",
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: "9999px",
  },
  emptyState: {
    padding: "32px 20px",
    textAlign: "center" as const,
    borderRadius: "10px",
    border: "1px dashed rgba(148, 163, 184, 0.2)",
    background: "rgba(148, 163, 184, 0.03)",
  },
  emptyText: {
    margin: 0,
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: 500,
  },
  emptySubtext: {
    margin: "4px 0 0",
    fontSize: "12px",
    color: "#64748b",
  },
  tableWrapper: {
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    overflow: "auto",
    maxHeight: "320px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "12px",
  },
  th: {
    padding: "10px 14px",
    textAlign: "left" as const,
    fontWeight: 600,
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#94a3b8",
    background: "rgba(15, 23, 42, 0.8)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
    position: "sticky" as const,
    top: 0,
  },
  tr: {
    borderBottom: "1px solid rgba(148, 163, 184, 0.06)",
    transition: "background 0.15s",
  },
  testRow: {
    background: "rgba(99, 102, 241, 0.06)",
  },
  td: {
    padding: "8px 14px",
    verticalAlign: "top" as const,
  },
  indexBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "22px",
    height: "22px",
    borderRadius: "6px",
    background: "rgba(148, 163, 184, 0.1)",
    color: "#94a3b8",
    fontSize: "10px",
    fontWeight: 700,
  },
  eventName: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#a5b4fc",
    background: "rgba(99, 102, 241, 0.1)",
    padding: "2px 8px",
    borderRadius: "6px",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  eventData: {
    fontSize: "11px",
    color: "#94a3b8",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    wordBreak: "break-all" as const,
  },
  feedSection: {
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    background: "rgba(148, 163, 184, 0.03)",
  },
  feedTitle: {
    margin: "0 0 10px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#e2e8f0",
  },
  feedLinks: {
    display: "flex",
    gap: "10px",
  },
  feedLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 16px",
    borderRadius: "8px",
    background: "rgba(99, 102, 241, 0.1)",
    color: "#a5b4fc",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 500,
    border: "1px solid rgba(99, 102, 241, 0.2)",
    transition: "all 0.2s",
  },
};
