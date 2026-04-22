import { useNavigate, useSearchParams } from "react-router-dom";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import ClosetGrid from "../components/closets/ClosetGrid";
import ItemGrid from "../components/items/ItemGrid";
import Hairline from "../components/ui/Hairline";
import { useClosets } from "../hooks/useClosets";
import { useItems } from "../hooks/useItems";
import { useTags } from "../hooks/useTags";
import { formatCompactCurrency, parsePriceToNumber } from "../lib/format";
import { useAppShell } from "../components/layout/AppShell";
import { useAuthStore } from "../store/auth";

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openItemDrawer, openClosetForm } = useAppShell();
  const user = useAuthStore((state) => state.user);
  const closetsQuery = useClosets();
  const itemsQuery = useItems({
    search: searchParams.get("search") ?? "",
    season: searchParams.get("season"),
    sort: (searchParams.get("sort") as "newest" | "oldest" | "updated" | null) ?? "newest"
  });
  const tagsQuery = useTags();
  const closets = closetsQuery.data ?? [];
  const items = itemsQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const totalValue = items.reduce((sum, item) => sum + parsePriceToNumber(item.price), 0);

  if (!closets.length) {
    return (
      <div style={{ padding: "60px 40px", maxWidth: 720, margin: "40px auto", textAlign: "center" }}>
        <div style={{ padding: "80px 40px", border: "1px dashed var(--ws-hairline)" }}>
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
    <div style={{ padding: "32px 40px 60px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 1fr)",
          gap: 40,
          paddingBottom: 40,
          borderBottom: "1px solid var(--ws-hairline)",
          marginBottom: 40
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

          <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 28 }}>
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
            padding: 24,
            border: "1px solid var(--ws-hairline)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.18), transparent)"
          }}
        >
          <Eyebrow>Snapshot</Eyebrow>
          <div style={{ marginTop: 12, display: "grid", gap: 10, color: "var(--ws-muted)", fontSize: 13 }}>
            <div>{items.filter((item) => item.favorited).length} favorited pieces ready to revisit.</div>
            <div>{items.filter((item) => item.originalPrice).length} items currently track a marked-down price.</div>
            <div>{items.filter((item) => !item.sectionId).length} items still need a section home.</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, marginBottom: 20 }}>
        <Display as="h2" size={28}>
          Your closets
        </Display>
      </div>

      <ClosetGrid closets={closets} onOpen={(closet) => navigate(`/closets/${closet.id}`)} onCreate={() => openClosetForm(null)} />

      <Hairline style={{ margin: "48px 0 24px" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, marginBottom: 20 }}>
        <Display as="h2" size={28}>
          Recent arrivals
        </Display>
        <Eyebrow>{items.length} visible items</Eyebrow>
      </div>

      <ItemGrid items={items.slice(0, 8)} onOpen={(item) => openItemDrawer(item.id)} />
    </div>
  );
}
