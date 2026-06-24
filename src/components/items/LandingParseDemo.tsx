import { useState } from "react";
import { Link } from "react-router-dom";
import Eyebrow from "../ui/Eyebrow";
import ProductPreviewCard from "./ProductPreviewCard";
import { useParseUrlPublic } from "../../hooks/useItems";
import type { ParsedProduct } from "../../types";

// Public, no-auth taste of the parser for logged-out landing visitors. Parses a
// pasted product URL (demoMode server-side: no AI enrichment, nothing saved) and
// shows the preview card plus a sign-up CTA.
export default function LandingParseDemo() {
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [parsed, setParsed] = useState<ParsedProduct | null>(null);
  const parseMutation = useParseUrlPublic();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      return;
    }

    setParsed(null);
    try {
      const result = await parseMutation.mutateAsync(trimmed);
      setSubmittedUrl(trimmed);
      setParsed(result);
    } catch {
      // Error surfaced via parseMutation.isError below.
    }
  }

  return (
    <div
      style={{
        marginTop: 32,
        padding: 20,
        background: "var(--ws-paper)",
        border: "1px solid var(--ws-hairline)"
      }}
    >
      <Eyebrow>Try it — paste a product link</Eyebrow>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://store.com/that-jacket"
          style={{
            flex: 1,
            minWidth: 220,
            padding: "13px 14px",
            border: "1px solid var(--ws-hairline)",
            background: "var(--ws-surface)",
            color: "var(--ws-ink)",
            fontFamily: "var(--ws-mono)",
            fontSize: 13
          }}
        />
        <button
          type="submit"
          disabled={parseMutation.isPending}
          style={{
            padding: "13px 26px",
            background: "var(--ws-ink)",
            color: "var(--ws-paper)",
            fontFamily: "var(--ws-ui)",
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            cursor: parseMutation.isPending ? "default" : "pointer",
            opacity: parseMutation.isPending ? 0.6 : 1
          }}
        >
          {parseMutation.isPending ? "Reading…" : "Try it"}
        </button>
      </form>

      {parseMutation.isError ? (
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            border: "1px solid var(--ws-accent)",
            background: "var(--ws-surface)",
            fontFamily: "var(--ws-ui)",
            fontSize: 12,
            color: "var(--ws-accent)"
          }}
        >
          We couldn&apos;t reach that page. Try another product link.
        </div>
      ) : null}

      {parsed ? (
        <div style={{ marginTop: 16 }}>
          <ProductPreviewCard parsed={parsed} url={submittedUrl} />
          <Link
            to="/register"
            style={{
              display: "inline-block",
              marginTop: 14,
              padding: "13px 28px",
              background: "var(--ws-ink)",
              color: "var(--ws-paper)",
              fontFamily: "var(--ws-ui)",
              fontSize: 11,
              letterSpacing: 1.6,
              textTransform: "uppercase"
            }}
          >
            Sign up to save this
          </Link>
        </div>
      ) : null}
    </div>
  );
}
