import { USERS, useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function AuthGate() {
  const { setUser } = useAuth();
  const { t } = useTheme();

  return (
    <div
      style={{
        background: t.pageBg,
        minHeight: "100vh",
        color: t.text,
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
        <div style={{ fontWeight: 700, fontSize: "28px", color: t.textStrong, letterSpacing: "-0.5px", marginBottom: "8px" }}>
          Knowledge
        </div>
        <div style={{ color: t.textGhost, fontSize: "14px" }}>
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
              background: t.cardBg,
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
              e.currentTarget.style.background = t.cardBg;
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

            <div style={{ color: t.textStrong, fontWeight: 700, fontSize: "16px", marginBottom: "4px" }}>
              {u.userid}
            </div>
            <div style={{ color: u.color, fontSize: "12px", fontWeight: 500, marginBottom: "16px" }}>
              {u.label}
            </div>

            {/* Token */}
            <div style={{ background: t.deepBg, border: `1px solid ${t.borderSubtle}`, borderRadius: "6px", padding: "8px 10px" }}>
              <div style={{ color: t.textDisabled, fontSize: "9px", fontWeight: 700, textTransform: "uppercase", marginBottom: "3px" }}>
                Auth Token
              </div>
              <div
                style={{
                  color: t.textGhost,
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
          background: t.blueTint,
          border: `1px solid ${t.blue}50`,
          borderRadius: "8px",
          padding: "14px 20px",
          maxWidth: "540px",
          textAlign: "center",
        }}
      >
        <div style={{ color: t.blue, fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
          Entitlement Model
        </div>
        <div style={{ color: t.textDim, fontSize: "12px", lineHeight: "1.5" }}>
          Each user can upload and query their own documents. Cross-user document access is blocked — user1 cannot read or query user2's files, and vice versa.
        </div>
      </div>
    </div>
  );
}
