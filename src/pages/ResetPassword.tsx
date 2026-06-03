import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import VersionTag from "../components/ui/VersionTag";
import { resetPassword } from "../api/auth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => navigate("/login", { state: { passwordReset: true } })
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);

    if (password.length < 8) {
      setClientError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setClientError("Passwords don't match.");
      return;
    }

    await mutation.mutateAsync({ token, password }).catch(() => {});
  }

  const cardStyle = {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: 24,
    background: "radial-gradient(ellipse at top, #EFE8DA, transparent 70%), #DDD4C2"
  } as const;

  const formStyle = {
    width: "min(460px, 100%)",
    background: "var(--ws-paper)",
    border: "1px solid var(--ws-hairline)",
    padding: 28
  } as const;

  if (!token) {
    return (
      <div style={cardStyle}>
        <div style={formStyle}>
          <Eyebrow>Reset password</Eyebrow>
          <Display size={40} style={{ marginTop: 12 }}>
            Invalid link.
          </Display>
          <div style={{ marginTop: 24, fontSize: 14, color: "var(--ws-muted)", lineHeight: 1.6 }}>
            This reset link is missing or malformed. Request a new one to continue.
          </div>
          <div style={{ marginTop: 16, fontSize: 13, color: "var(--ws-muted)" }}>
            <Link to="/forgot-password" style={{ color: "var(--ws-accent)" }}>Request a new link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <Eyebrow>Reset password</Eyebrow>
        <Display size={40} style={{ marginTop: 12 }}>
          Choose a new password.
        </Display>

        <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            style={{
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)",
              padding: "14px 16px"
            }}
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Confirm new password"
            style={{
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)",
              padding: "14px 16px"
            }}
          />
        </div>

        {clientError || mutation.isError ? (
          <div style={{ marginTop: 14, color: "var(--ws-accent)", fontSize: 13 }}>
            {clientError ?? "This reset link is invalid or has expired."}
          </div>
        ) : null}

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
          Set new password
        </button>

        <div style={{ marginTop: 16, fontSize: 13, color: "var(--ws-muted)" }}>
          <Link to="/login" style={{ color: "var(--ws-accent)" }}>Back to log in</Link>
        </div>

        <div style={{ marginTop: 28 }}>
          <VersionTag align="center" />
        </div>
      </form>
    </div>
  );
}
