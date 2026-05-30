import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import type { GoogleCredentialResponse } from "../../types/google";

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GIS_SCRIPT_ID = "google-gsi-client";
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

function loadGisScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById(GIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Identity Services.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GIS_SCRIPT_ID;
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services."));
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { googleLoginMutation } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!clientId || !buttonRef.current) {
      return;
    }

    let cancelled = false;

    async function handleCredentialResponse(response: GoogleCredentialResponse) {
      try {
        await googleLoginMutation.mutateAsync(response.credential);
        navigate(location.state?.from?.pathname ?? "/");
      } catch {
        // Surfaced via googleLoginMutation.isError below.
      }
    }

    loadGisScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId!,
          callback: handleCredentialResponse
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          width: 360
        });
      })
      .catch(() => {
        // GIS unavailable; the password form remains usable.
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!clientId) {
    return null;
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          margin: "4px 0 16px",
          color: "var(--ws-muted)",
          fontFamily: "var(--ws-mono)",
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: "uppercase"
        }}
      >
        <span style={{ flex: 1, height: 1, background: "var(--ws-hairline)" }} />
        or
        <span style={{ flex: 1, height: 1, background: "var(--ws-hairline)" }} />
      </div>
      <div ref={buttonRef} style={{ display: "flex", justifyContent: "center" }} />
      {googleLoginMutation.isError ? (
        <div style={{ marginTop: 12, color: "var(--ws-accent)", fontSize: 13 }}>
          Google sign-in failed. Please try again.
        </div>
      ) : null}
    </div>
  );
}
