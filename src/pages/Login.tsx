import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import VersionTag from "../components/ui/VersionTag";
import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginMutation } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);

    if (!email.trim()) {
      setClientError("Enter your email address.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setClientError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setClientError("Enter your password.");
      return;
    }

    // mutateAsync rejects on bad credentials; the error is rendered below, so swallow the
    // rejection rather than leaving it unhandled (and skip the navigate on failure).
    await loginMutation
      .mutateAsync({ email, password })
      .then(() => navigate(location.state?.from?.pathname ?? "/"))
      .catch(() => {});
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
        // Suppress the native validation bubble so the inline, screen-reader-announced
        // errors below are what the user actually gets. The required/type attributes stay
        // for semantics; handleSubmit now covers empty and malformed input itself.
        noValidate
        style={{
          width: "min(460px, 100%)",
          background: "var(--ws-paper)",
          border: "1px solid var(--ws-hairline)",
          padding: 28
        }}
      >
        <Eyebrow>Welcome back</Eyebrow>
        <Display size={40} style={{ marginTop: 12 }}>
          Window Shopping.
        </Display>

        <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
          {/* The card has no visible field labels by design, so the accessible name comes
              from aria-label — a placeholder alone disappears on typing. */}
          <input
            type="email"
            required
            aria-label="Email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            style={{
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)",
              color: "var(--ws-ink)",
              padding: "14px 16px"
            }}
          />
          <input
            type="password"
            required
            aria-label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            style={{
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)",
              color: "var(--ws-ink)",
              padding: "14px 16px"
            }}
          />
        </div>

        {clientError || loginMutation.isError ? (
          <div role="alert" style={{ marginTop: 14, color: "var(--ws-accent)", fontSize: 13 }}>
            {clientError ?? "Invalid email or password."}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loginMutation.isPending}
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
          Log in
        </button>

        <GoogleSignInButton />

        <div style={{ marginTop: 16, fontSize: 13, color: "var(--ws-muted)" }}>
          New here? <Link to="/register" style={{ color: "var(--ws-accent)" }}>Create an account</Link>
        </div>

        <div style={{ marginTop: 8, fontSize: 13, color: "var(--ws-muted)" }}>
          <Link to="/forgot-password" style={{ color: "var(--ws-accent)" }}>Forgot password?</Link>
        </div>

        <div style={{ marginTop: 28 }}>
          <VersionTag align="center" />
        </div>
      </form>
    </div>
  );
}
