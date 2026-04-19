import { Link } from "react-router-dom";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        textAlign: "center"
      }}
    >
      <div>
        <Eyebrow>404</Eyebrow>
        <Display size={48} style={{ marginTop: 12 }}>
          That wardrobe page doesn&apos;t exist.
        </Display>
        <Link to="/" style={{ display: "inline-block", marginTop: 18, color: "var(--ws-accent)" }}>
          Back home
        </Link>
      </div>
    </div>
  );
}
