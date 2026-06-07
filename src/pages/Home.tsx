import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import ClosetGrid from "../components/closets/ClosetGrid";
import ItemGrid from "../components/items/ItemGrid";
import Hairline from "../components/ui/Hairline";
import VersionTag from "../components/ui/VersionTag";
import { useClosets } from "../hooks/useClosets";
import { useItems } from "../hooks/useItems";
import { useTags } from "../hooks/useTags";
import { formatCompactCurrency, parsePriceToNumber } from "../lib/format";
import { useAppShell } from "../components/layout/AppShell";
import { useAuthStore } from "../store/auth";
import { useIsMobile } from "../hooks/useMediaQuery";

export default function Home() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openItemDrawer, openClosetForm } = useAppShell();
  const user = useAuthStore((state) => state.user);
  const closetsQuery = useClosets();
  const activeTags = (searchParams.get("tags") ?? "").split(",").filter(Boolean);
  const itemsQuery = useItems({
    search: searchParams.get("search") ?? "",
    season: searchParams.get("season"),
    sort: (searchParams.get("sort") as "newest" | "oldest" | "updated" | null) ?? "newest",
    tags: activeTags.length ? activeTags : undefined
  });
  const tagsQuery = useTags();
  const closets = closetsQuery.data ?? [];
  const allItems = itemsQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  const viewAll = searchParams.get("view") === "all";
  const priceDrops = searchParams.get("priceDrops") === "true";
  const favoritedOnly = searchParams.get("favorited") === "true";
  const noSectionOnly = searchParams.get("noSection") === "true";

  const items = (() => {
    let result = allItems;
    if (priceDrops) result = result.filter((item) => item.originalPrice);
    if (favoritedOnly) result = result.filter((item) => item.favorited);
    if (noSectionOnly) result = result.filter((item) => !item.sectionId);
    return result;
  })();

  const totalValue = allItems.reduce((sum, item) => sum + parsePriceToNumber(item.price), 0);

  if (viewAll || priceDrops || favoritedOnly || noSectionOnly) {
    const viewLabel = priceDrops
      ? "Price drops"
      : favoritedOnly
      ? "Favorited"
      : noSectionOnly
      ? "Needs a section"
      : "Everything";

    return (
      <div style={{ padding: isMobile ? "20px 16px 40px" : "32px 40px 60px" }}>
        <Link
          to="/"
          style={{
            display: "inline-block",
            marginBottom: 18,
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: "uppercase",
            color: "var(--ws-muted)"
          }}
        >
          ← All closets
        </Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, marginBottom: 28, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <div>
            <Eyebrow>{searchParams.get("season") ?? "All seasons"} · {viewLabel}</Eyebrow>
            <Display as="h2" size={48} style={{ marginTop: 8 }}>
              {viewLabel}
            </Display>
          </div>
          <Eyebrow>{items.length} items</Eyebrow>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ws-muted)", fontSize: 14 }}>
            No items match this filter.
          </div>
        ) : (
          <ItemGrid items={items} onOpen={(item) => openItemDrawer(item.id)} />
        )}
        <footer style={{ marginTop: 48, paddingTop: 18, borderTop: "1px solid var(--ws-hairline)" }}>
          <VersionTag align="right" />
        </footer>
      </div>
    );
  }

  if (!closets.length) {
    return (
      <div style={{ padding: isMobile ? "32px 16px" : "60px 40px", maxWidth: 720, margin: isMobile ? "16px auto" : "40px auto", textAlign: "center" }}>
        <div style={{ padding: isMobile ? "44px 20px" : "80px 40px", border: "1px dashed var(--ws-hairline)" }}>
          <Eyebrow>Empty wardrobe</Eyebrow>
          <Display size={48} style={{ marginTop: 16, marginBottom: 10 }}>
            Nothing saved,
            <em style={{ fontStyle: "italic", color: "var(--ws-accent)", fontWeight: 300 }}> yet</em>.
          </Display>
          <div style={{ maxWidth: 420, margin: "0 auto 28px", fontSize: 14, lineHeight: 1.6, color: "var(--ws-muted)" }}>
            Create a closet first, then paste a product link and start building a wardrobe you can actually use.
          </div>
          <button
            type="button"
            onClick={() => openClosetForm(null)}
            style={{
              padding: "14px 32px",
              border: "none",
              background: "var(--ws-ink)",
              color: "var(--ws-paper)",
              cursor: "pointer",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: 1.8
            }}
          >
            Create your first closet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobile ? "20px 16px 40px" : "32px 40px 60px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.4fr) minmax(280px, 1fr)",
          gap: isMobile ? 24 : 40,
          paddingBottom: isMobile ? 28 : 40,
          borderBottom: "1px solid var(--ws-hairline)",
          marginBottom: isMobile ? 28 : 40
        }}
      >
        <div>
          <Eyebrow>{searchParams.get("season") ?? "All seasons"} · Dashboard</Eyebrow>
          <Display size={80} style={{ marginTop: 16, lineHeight: 0.95 }}>
            Good evening,
            <br />
            <em style={{ fontStyle: "italic", fontWeight: 300, color: "var(--ws-accent)" }}>
              {user?.name ?? "there"}
            </em>
            .
          </Display>
          <div style={{ marginTop: 20, maxWidth: 520, fontSize: 15, lineHeight: 1.6, color: "var(--ws-muted)" }}>
            This is your live wardrobe now: real data, searchable inventory, and recent saves pulled straight from the API.
          </div>

          <div style={{ display: "flex", gap: isMobile ? 16 : 28, flexWrap: "wrap", marginTop: 28 }}>
            {[
              { value: items.length, label: "items saved" },
              { value: closets.length, label: "closets" },
              { value: tags.length, label: "tags" },
              { value: formatCompactCurrency(totalValue), label: "closet value" }
            ].map((entry) => (
              <div key={entry.label}>
                <div style={{ fontFamily: "var(--ws-display)", fontSize: 28, fontWeight: 300 }}>{entry.value}</div>
                <Eyebrow>{entry.label}</Eyebrow>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: isMobile ? 18 : 24,
            border: "1px solid var(--ws-hairline)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.18), transparent)"
          }}
        >
          <Eyebrow>Snapshot</Eyebrow>
          <div style={{ marginTop: 12, display: "grid", gap: 10, fontSize: 13 }}>
            {[
              { count: allItems.filter((item) => item.favorited).length, label: "favorited pieces ready to revisit.", to: "/?favorited=true" },
              { count: allItems.filter((item) => item.originalPrice).length, label: "items currently track a marked-down price.", to: "/?priceDrops=true" },
              { count: allItems.filter((item) => !item.sectionId).length, label: "items still need a section home.", to: "/?noSection=true" }
            ].map(({ count, label, to }) => (
              <Link
                key={to}
                to={to}
                style={{ color: "var(--ws-muted)", textDecoration: "none" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ws-ink)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "var(--ws-muted)"; }}
              >
                {count} {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, marginBottom: 20, flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <Display as="h2" size={28}>
          Your closets
        </Display>
      </div>

      <ClosetGrid closets={closets} onOpen={(closet) => navigate(`/closets/${closet.id}`)} onCreate={() => openClosetForm(null)} />

      <Hairline style={{ margin: isMobile ? "36px 0 20px" : "48px 0 24px" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, marginBottom: 20, flexWrap: isMobile ? "wrap" : "nowrap" }}>
        <Display as="h2" size={28}>
          Recent arrivals
        </Display>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <Eyebrow>{allItems.length} total items</Eyebrow>
          {allItems.length > 8 ? (
            <Link
              to="/?view=all"
              style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ws-muted)" }}
            >
              View all →
            </Link>
          ) : null}
        </div>
      </div>

      <ItemGrid items={allItems.slice(0, 8)} onOpen={(item) => openItemDrawer(item.id)} />

      <footer
        style={{
          marginTop: 48,
          paddingTop: 18,
          borderTop: "1px solid var(--ws-hairline)"
        }}
      >
        <VersionTag align="right" />
      </footer>
    </div>
  );
}
