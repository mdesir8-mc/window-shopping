import { Link } from "react-router-dom";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import Hairline from "../components/ui/Hairline";
import VersionTag from "../components/ui/VersionTag";
import Wordmark from "../components/ui/Wordmark";
import LandingParseDemo from "../components/items/LandingParseDemo";

const STEPS = [
  {
    title: "Paste a link, get an item",
    body: "Drop in a URL from almost any store. The photo, price, and details get pulled in, so you're not screenshotting or copy-pasting by hand."
  },
  {
    title: "Sort it into closets",
    body: "Group saves into closets: a coat you're hunting, a gift list, a someday pile. Tag and search across everything you've kept."
  },
  {
    title: "Catch the price drop",
    body: "Saved items keep watching their price. When one is marked down, it shows up under price drops."
  },
  {
    title: "Know when it's back",
    body: "If a piece sells out, it's flagged. When it restocks, an email digest tells you — no refreshing the page."
  }
];

export default function Landing() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #EFE8DA, transparent 70%), #DDD4C2",
        color: "var(--ws-ink)"
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "24px clamp(24px, 6vw, 80px)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Wordmark size={22} />
          <Display size={20} weight={400}>
            Window Shopping
          </Display>
        </div>
        <Link
          to="/login"
          style={{
            fontFamily: "var(--ws-ui)",
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: "var(--ws-ink)"
          }}
        >
          Log in
        </Link>
      </header>

      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "clamp(32px, 8vh, 96px) clamp(24px, 6vw, 80px) 64px"
        }}
      >
        <section style={{ maxWidth: 680 }}>
          <Eyebrow>Save now, decide later</Eyebrow>
          <Display size={68} style={{ marginTop: 16, lineHeight: 0.98 }}>
            Every link you meant
            <br />
            to come back to.
          </Display>
          <p
            style={{
              marginTop: 24,
              maxWidth: 560,
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--ws-muted)"
            }}
          >
            Paste a product link and Window Shopping turns it into a saved item — sorted into closets,
            searchable, and watched for price drops and restocks. We email you when something you saved goes
            on sale or comes back in stock.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 32 }}>
            <Link
              to="/register"
              style={{
                padding: "15px 34px",
                background: "var(--ws-ink)",
                color: "var(--ws-paper)",
                fontFamily: "var(--ws-ui)",
                fontSize: 11,
                letterSpacing: 1.8,
                textTransform: "uppercase"
              }}
            >
              Create an account
            </Link>
            <Link
              to="/login"
              style={{
                padding: "15px 34px",
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-paper)",
                color: "var(--ws-ink)",
                fontFamily: "var(--ws-ui)",
                fontSize: 11,
                letterSpacing: 1.8,
                textTransform: "uppercase"
              }}
            >
              Log in
            </Link>
          </div>

          <LandingParseDemo />
        </section>

        <Hairline style={{ margin: "64px 0 40px" }} />

        <section>
          <Eyebrow>How it works</Eyebrow>
          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 1,
              background: "var(--ws-hairline)",
              border: "1px solid var(--ws-hairline)"
            }}
          >
            {STEPS.map((step, index) => (
              <div key={step.title} style={{ background: "var(--ws-paper)", padding: 24 }}>
                <Eyebrow>{String(index + 1).padStart(2, "0")}</Eyebrow>
                <Display as="h3" size={20} weight={400} style={{ marginTop: 12 }}>
                  {step.title}
                </Display>
                <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.6, color: "var(--ws-muted)" }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <footer style={{ marginTop: 56, paddingTop: 18, borderTop: "1px solid var(--ws-hairline)" }}>
          <VersionTag align="left" />
        </footer>
      </main>
    </div>
  );
}
