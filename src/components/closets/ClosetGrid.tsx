import type { Closet } from "../../types";
import ClosetCard from "./ClosetCard";
import { useIsMobile } from "../../hooks/useMediaQuery";

interface ClosetGridProps {
  closets: Closet[];
  onOpen: (closet: Closet) => void;
  onCreate: () => void;
}

export default function ClosetGrid({ closets, onOpen, onCreate }: ClosetGridProps) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(auto-fill, minmax(150px, 1fr))" : "repeat(auto-fill, minmax(220px, 300px))",
        gap: isMobile ? 14 : 20
      }}
    >
      {closets.map((closet) => (
        <ClosetCard key={closet.id} closet={closet} onClick={() => onOpen(closet)} />
      ))}

      <button
        type="button"
        onClick={onCreate}
        style={{
          aspectRatio: "3 / 4",
          border: "1px dashed var(--ws-hairline)",
          background: "transparent",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: "var(--ws-ui)",
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          color: "var(--ws-muted)"
        }}
      >
        <span style={{ fontFamily: "var(--ws-display)", fontSize: 32, fontWeight: 300 }}>+</span>
        New closet
      </button>
    </div>
  );
}
