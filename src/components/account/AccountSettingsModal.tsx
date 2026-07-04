import { useEffect, useState } from "react";
import type { User } from "../../types";
import { THEME_OPTIONS, type ThemeName } from "../../constants";
import { useAuth } from "../../hooks/useAuth";
import Modal from "../ui/Modal";
import Eyebrow from "../ui/Eyebrow";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { downloadWishlistExport, type ExportFormat } from "../../api/export";

type Tab = "general" | "profile";

interface AccountSettingsModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  theme: ThemeName;
  dark: boolean;
  onSelectTheme: (theme: ThemeName) => void;
  onToggleDark: () => void;
  onSignOut: () => void;
}

export default function AccountSettingsModal({
  open,
  onClose,
  user,
  theme,
  dark,
  onSelectTheme,
  onToggleDark,
  onSignOut
}: AccountSettingsModalProps) {
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>("general");
  const [name, setName] = useState(user?.name ?? "");
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [exportError, setExportError] = useState("");
  const { updateProfileMutation } = useAuth();

  // Reset the modal to a clean state each time it opens. Keyed on `open` only so a
  // successful save (which updates user.name) doesn't bounce the user off the tab.
  useEffect(() => {
    if (open) {
      setTab("general");
      setName(user?.name ?? "");
      setExportError("");
      setExportingFormat(null);
      updateProfileMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const trimmedName = name.trim();
  const nameUnchanged = trimmedName.length === 0 || trimmedName === (user?.name ?? "");
  const emailsOn = user?.emailNotifications ?? true;

  async function handleExport(format: ExportFormat) {
    setExportingFormat(format);
    setExportError("");

    try {
      await downloadWishlistExport(format);
    } catch {
      setExportError("Couldn't export your wishlist. Try again shortly.");
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} width={460}>
      <div style={{ padding: isMobile ? 20 : 24 }}>
        <div style={{ fontFamily: "var(--ws-display)", fontSize: 24, fontWeight: 300 }}>Account settings</div>

        <div style={{ display: "flex", gap: 4, marginTop: 18, borderBottom: "1px solid var(--ws-hairline)" }}>
          {([
            { value: "general", label: "General" },
            { value: "profile", label: "Profile" }
          ] as Array<{ value: Tab; label: string }>).map((entry) => (
            <button
              key={entry.value}
              type="button"
              onClick={() => setTab(entry.value)}
              style={{
                padding: "8px 12px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontFamily: "var(--ws-ui)",
                fontSize: 13,
                color: tab === entry.value ? "var(--ws-ink)" : "var(--ws-muted)",
                borderBottom: tab === entry.value ? "2px solid var(--ws-accent)" : "2px solid transparent",
                marginBottom: -1
              }}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {tab === "general" ? (
          <div style={{ marginTop: 20 }}>
            <Eyebrow style={{ marginBottom: 8 }}>Appearance</Eyebrow>
            <div style={{ fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ws-muted)", marginBottom: 6 }}>
              Theme
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: isMobile ? "wrap" : "nowrap" }}>
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSelectTheme(option.value)}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    border: "1px solid var(--ws-hairline)",
                    background: theme === option.value ? "var(--ws-ink)" : "var(--ws-hover-bg, transparent)",
                    color: theme === option.value ? "var(--ws-paper)" : "var(--ws-ink)",
                    cursor: "pointer",
                    fontSize: 10,
                    textTransform: "uppercase"
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onToggleDark}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px 12px",
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-hover-bg, transparent)",
                cursor: "pointer",
                color: "var(--ws-ink)"
              }}
            >
              {dark ? "Dark mode on" : "Dark mode off"}
            </button>

            <div style={{ marginTop: 22 }}>
              <Eyebrow style={{ marginBottom: 8 }}>Notifications</Eyebrow>
              <button
                type="button"
                disabled={updateProfileMutation.isPending}
                onClick={() => updateProfileMutation.mutate({ emailNotifications: !emailsOn })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-hover-bg, transparent)",
                  cursor: updateProfileMutation.isPending ? "default" : "pointer",
                  color: "var(--ws-ink)",
                  opacity: updateProfileMutation.isPending ? 0.7 : 1
                }}
              >
                {emailsOn ? "Price-drop emails on" : "Price-drop emails off"}
              </button>
              <div style={{ marginTop: 6, fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)", lineHeight: 1.5 }}>
                Get an email when a refreshed item drops in price or goes out of stock.
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <Eyebrow style={{ marginBottom: 8 }}>Export</Eyebrow>
              <div style={{ display: "flex", gap: 8 }}>
                {(["csv", "json"] as const).map((format) => (
                  <button
                    key={format}
                    type="button"
                    disabled={exportingFormat !== null}
                    onClick={() => void handleExport(format)}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      border: "1px solid var(--ws-hairline)",
                      background: "var(--ws-hover-bg, transparent)",
                      cursor: exportingFormat !== null ? "default" : "pointer",
                      color: "var(--ws-ink)",
                      opacity: exportingFormat !== null && exportingFormat !== format ? 0.55 : 1
                    }}
                  >
                    {exportingFormat === format ? "Exporting..." : format.toUpperCase()}
                  </button>
                ))}
              </div>
              {exportError ? (
                <div style={{ marginTop: 8, fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-accent)", lineHeight: 1.5 }}>
                  {exportError}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 22 }}>
              <Eyebrow style={{ marginBottom: 8 }}>Account</Eyebrow>
              <button
                type="button"
                onClick={onSignOut}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-hover-bg, transparent)",
                  cursor: "pointer",
                  color: "var(--ws-accent)"
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 20 }}>
            <Eyebrow style={{ marginBottom: 12 }}>Profile</Eyebrow>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name ?? "Account"}
                  referrerPolicy="no-referrer"
                  style={{ width: 44, height: 44, borderRadius: 44, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 44,
                    display: "grid",
                    placeItems: "center",
                    background: "var(--ws-accent)",
                    color: "var(--ws-paper)",
                    fontFamily: "var(--ws-display)",
                    fontSize: 18
                  }}
                >
                  {user?.name?.[0] ?? "W"}
                </div>
              )}
              <div style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>
                {user?.plan ?? "free"} plan
              </div>
            </div>

            <label style={{ display: "block", fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ws-muted)", marginBottom: 6 }}>
              Display name
            </label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-hover-bg, transparent)",
                color: "var(--ws-ink)",
                fontFamily: "var(--ws-ui)",
                fontSize: 13
              }}
            />

            <label style={{ display: "block", fontSize: 9, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--ws-muted)", margin: "16px 0 6px" }}>
              Email
            </label>
            <div
              style={{
                padding: "10px 12px",
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-surface)",
                color: "var(--ws-muted)",
                fontFamily: "var(--ws-ui)",
                fontSize: 13
              }}
            >
              {user?.email ?? "—"}
            </div>

            {user?.isGoogleAccount ? (
              <div style={{ marginTop: 10, fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)", lineHeight: 1.5 }}>
                Email and photo are managed by Google. Your display name set here overrides the Google name.
              </div>
            ) : null}

            {updateProfileMutation.isError ? (
              <div style={{ marginTop: 10, fontSize: 11, color: "var(--ws-accent)" }}>
                Couldn't save. Try again shortly.
              </div>
            ) : null}

            <button
              type="button"
              disabled={nameUnchanged || updateProfileMutation.isPending}
              onClick={() => {
                updateProfileMutation.mutate({ name: trimmedName });
              }}
              style={{
                width: "100%",
                marginTop: 16,
                padding: "10px 12px",
                border: "1px solid var(--ws-ink)",
                background: nameUnchanged || updateProfileMutation.isPending ? "var(--ws-hover-bg, transparent)" : "var(--ws-ink)",
                color: nameUnchanged || updateProfileMutation.isPending ? "var(--ws-muted)" : "var(--ws-paper)",
                cursor: nameUnchanged || updateProfileMutation.isPending ? "default" : "pointer",
                opacity: nameUnchanged || updateProfileMutation.isPending ? 0.7 : 1
              }}
            >
              {updateProfileMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
