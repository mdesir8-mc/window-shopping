import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import VersionTag from "../components/ui/VersionTag";
import { requestPasswordReset } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({ mutationFn: requestPasswordReset });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await mutation.mutateAsync(email).catch(() => {});
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "radial-gradient(ellipse at top, #EFE8DA, transparent 70%), #DDD4C2"
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "min(460px, 100%)",
          background: "var(--ws-paper)",
          border: "1px solid var(--ws-hairline)",
          padding: 28
        }}
      >
        <Eyebrow>Reset password</Eyebrow>
        <Display size={40} style={{ marginTop: 12 }}>
          Forgot password.
        </Display>

        {mutation.isSuccess ? (
          <div style={{ marginTop: 24, fontSize: 14, color: "var(--ws-muted)", lineHeight: 1.6 }}>
            If an account exists for that email, we&apos;ve sent a link to reset your
            password. Check your inbox.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                style={{
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-surface)",
                  padding: "14px 16px"
                }}
              />
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              style={{
                width: "100%",
                marginTop: 18,
                padding: "14px 16px",
                border: "none",
                background: "var(--ws-ink)",
                color: "var(--ws-paper)",
                cursor: "pointer",
                fontSize: 11,
                letterSpacing: 1.8,
                textTransform: "uppercase"
              }}
            >
              Send reset link
            </button>
          </>
        )}

        <div style={{ marginTop: 16, fontSize: 13, color: "var(--ws-muted)" }}>
          Remembered it? <Link to="/login" style={{ color: "var(--ws-accent)" }}>Back to log in</Link>
        </div>

        <div style={{ marginTop: 28 }}>
          <VersionTag align="center" />
        </div>
      </form>
    </div>
  );
}
