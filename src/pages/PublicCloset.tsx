import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import Hairline from "../components/ui/Hairline";
import ProductTile from "../components/ui/ProductTile";
import Tag from "../components/ui/Tag";
import { usePublicCloset } from "../hooks/useClosets";
import { hashTone } from "../lib/format";
import type { PublicItem } from "../types";

// Keep leaked share links out of search indexes (mirrors the API's X-Robots-Tag).
function useNoIndex() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);
}

function PageFrame({ children }: { children: React.ReactNode }) {
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
        <Display size={20} weight={400}>
          Window Shopping
        </Display>
        <Link
          to="/"
          style={{
            fontFamily: "var(--ws-ui)",
            fontSize: 11,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: "var(--ws-ink)"
          }}
        >
          Make your own
        </Link>
      </header>
      <main style={{ padding: "8px clamp(24px, 6vw, 80px) 80px" }}>{children}</main>
    </div>
  );
}

function PublicItemTile({ item }: { item: PublicItem }) {
  const tile = (
    <div style={{ padding: "8px 8px 14px", textAlign: "left" }}>
      <div style={{ position: "relative" }}>
        <ProductTile
          tone={hashTone(item.id)}
          imageUrl={item.imageUrl}
          style={{ width: "100%", aspectRatio: "3 / 4" }}
        />
        {item.onSale ? (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              padding: "3px 7px",
              background: "var(--ws-accent)",
              fontFamily: "var(--ws-mono)",
              fontSize: 9,
              color: "var(--ws-paper)",
              letterSpacing: 0.5
            }}
          >
            ON SALE
          </div>
        ) : null}
        {item.inStock === false ? (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              padding: "3px 7px",
              background: "var(--ws-overlay-paper)",
              backdropFilter: "blur(4px)",
              fontFamily: "var(--ws-mono)",
              fontSize: 9,
              color: "var(--ws-muted)",
              letterSpacing: 0.5,
              textTransform: "uppercase"
            }}
          >
            Sold out
          </div>
        ) : null}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "3px 7px",
            background: "var(--ws-overlay-paper)",
            backdropFilter: "blur(4px)",
            fontFamily: "var(--ws-mono)",
            fontSize: 9,
            color: "var(--ws-accent)"
          }}
        >
          {item.season}
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--ws-display)",
              fontSize: 12,
              fontStyle: "italic",
              color: "var(--ws-accent)"
            }}
          >
            {item.brand}
          </div>
          <div
            style={{
              marginTop: 2,
              fontFamily: "var(--ws-ui)",
              fontSize: 13,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {item.name}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "flex-end",
            gap: 6,
            flexWrap: "wrap",
            flexShrink: 0,
            fontFamily: "var(--ws-mono)",
            fontSize: 11
          }}
        >
          <span>{item.price ?? "TBD"}</span>
          {item.onSale && item.originalPrice ? (
            <span style={{ color: "var(--ws-muted)", textDecoration: "line-through" }}>
              {item.originalPrice}
            </span>
          ) : null}
        </div>
      </div>

      {item.tags.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {item.tags.slice(0, 2).map((tag) => (
            <Tag key={tag} size="sm">
              {tag}
            </Tag>
          ))}
          {item.tags.length > 2 ? (
            <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10, color: "var(--ws-muted)" }}>
              +{item.tags.length - 2}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (!item.url) {
    return tile;
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      style={{ display: "block", color: "inherit", textDecoration: "none" }}
    >
      {tile}
    </a>
  );
}

export default function PublicCloset() {
  useNoIndex();
  const { token } = useParams();
  const query = usePublicCloset(token);

  if (query.isLoading) {
    return (
      <PageFrame>
        <div
          style={{
            color: "var(--ws-muted)",
            fontFamily: "var(--ws-mono)",
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: "uppercase"
          }}
        >
          Loading closet...
        </div>
      </PageFrame>
    );
  }

  if (query.isError || !query.data) {
    return (
      <PageFrame>
        <Eyebrow>Not found</Eyebrow>
        <Display size={28} weight={400} style={{ marginTop: 8 }}>
          This link isn't available
        </Display>
        <p style={{ marginTop: 12, fontFamily: "var(--ws-ui)", fontSize: 14, color: "var(--ws-muted)" }}>
          The share link may have been turned off, or it never existed.
        </p>
      </PageFrame>
    );
  }

  const closet = query.data;

  return (
    <PageFrame>
      <Eyebrow>Shared closet</Eyebrow>
      <Display size={32} weight={400} style={{ marginTop: 8 }}>
        {closet.name}
      </Display>
      {closet.subtitle ? (
        <p style={{ marginTop: 8, fontFamily: "var(--ws-ui)", fontSize: 15, color: "var(--ws-muted)" }}>
          {closet.subtitle}
        </p>
      ) : null}
      <div
        style={{
          marginTop: 10,
          fontFamily: "var(--ws-mono)",
          fontSize: 11,
          letterSpacing: 0.5,
          color: "var(--ws-muted)"
        }}
      >
        {closet.itemCount} {closet.itemCount === 1 ? "item" : "items"}
      </div>
      <Hairline style={{ margin: "24px 0" }} />

      {closet.items.length === 0 ? (
        <p style={{ fontFamily: "var(--ws-ui)", fontSize: 14, color: "var(--ws-muted)" }}>
          This closet is empty.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 260px))",
            gap: 20
          }}
        >
          {closet.items.map((item) => (
            <PublicItemTile key={item.id} item={item} />
          ))}
        </div>
      )}
    </PageFrame>
  );
}
