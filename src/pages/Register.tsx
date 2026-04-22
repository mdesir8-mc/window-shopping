import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const navigate = useNavigate();
  const { registerMutation } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await registerMutation.mutateAsync({ name, email, password });
    navigate("/");
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
        <Eyebrow>New wardrobe</Eyebrow>
        <Display size={40} style={{ marginTop: 12 }}>
          Create your account.
        </Display>

        <div style={{ display: "grid", gap: 14, marginTop: 24 }}>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            style={{
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)",
              padding: "14px 16px"
            }}
          />
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
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password (8+ characters)"
            style={{
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)",
              padding: "14px 16px"
            }}
          />
        </div>

        {registerMutation.isError ? (
          <div style={{ marginTop: 14, color: "var(--ws-accent)", fontSize: 13 }}>
            That signup didn&apos;t go through. Try a different email.
          </div>
        ) : null}

        <button
          type="submit"
          disabled={registerMutation.isPending}
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
          Create account
        </button>

        <div style={{ marginTop: 16, fontSize: 13, color: "var(--ws-muted)" }}>
          Already have one? <Link to="/login" style={{ color: "var(--ws-accent)" }}>Log in</Link>
        </div>
      </form>
    </div>
  );
}
