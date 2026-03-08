import { USERS, useAuth } from "../context/AuthContext";

export default function AuthGate() {
  const { setUser } = useAuth();

  return (
    <div
      style={{
        background: "#0d0d0d",
        minHeight: "100vh",
        color: "#e0e0e0",
        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ fontWeight: 700, fontSize: "28px", color: "#fff", letterSpacing: "-0.5px", marginBottom: "8px" }}>
          Knowledge on Fusion
        </div>
        <div style={{ color: "#555", fontSize: "14px" }}>
          Select your identity to continue
        </div>
      </div>

      {/* User cards */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
        {USERS.map((u) => (
          <button
            key={u.userid}
            onClick={() => setUser(u)}
            style={{
              background: "#0d0d0d",
              border: `2px solid ${u.color}40`,
              borderRadius: "12px",
              padding: "28px 32px",
              cursor: "pointer",
              textAlign: "left",
              width: "260px",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = `2px solid ${u.color}`;
              e.currentTarget.style.background = `${u.color}08`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = `2px solid ${u.color}40`;
              e.currentTarget.style.background = "#0d0d0d";
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: `${u.color}20`,
                border: `2px solid ${u.color}60`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                marginBottom: "16px",
              }}
            >
              👤
            </div>

            <div style={{ color: "#fff", fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
              {u.userid}
            </div>
            <div style={{ color: u.color, fontSize: "12px", fontWeight: 500, marginBottom: "16px" }}>
              {u.label}
            </div>

            {/* Token */}
            <div style={{ background: "#080808", border: "1px solid #1a1a1a", borderRadius: "6px", padding: "8px 10px" }}>
              <div style={{ color: "#444", fontSize: "9px", fontWeight: 700, textTransform: "uppercase", marginBottom: "3px" }}>
                Auth Token
              </div>
              <div
                style={{
                  color: "#555",
                  fontSize: "10px",
                  fontFamily: "'IBM Plex Mono', monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {u.token}
              </div>
            </div>

            {/* Entitlement badge */}
            <div
              style={{
                marginTop: "12px",
                background: `${u.color}10`,
                border: `1px solid ${u.color}30`,
                borderRadius: "4px",
                padding: "5px 10px",
                color: u.color,
                fontSize: "11px",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              Own documents only · Read-only access
            </div>
          </button>
        ))}
      </div>

      {/* Entitlement note */}
      <div
        style={{
          background: "#0a1520",
          border: "1px solid #1a3a5a",
          borderRadius: "8px",
          padding: "14px 20px",
          maxWidth: "540px",
          textAlign: "center",
        }}
      >
        <div style={{ color: "#3a7aba", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
          Entitlement Model
        </div>
        <div style={{ color: "#6a8aaa", fontSize: "12px", lineHeight: "1.5" }}>
          Each user can upload and query their own documents. Cross-user document access is blocked — user1 cannot read or query user2's files, and vice versa.
        </div>
      </div>
    </div>
  );
}
