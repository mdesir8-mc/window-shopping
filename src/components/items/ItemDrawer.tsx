import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import ProductTile from "../ui/ProductTile";
import Eyebrow from "../ui/Eyebrow";
import Display from "../ui/Display";
import Hairline from "../ui/Hairline";
import Tag from "../ui/Tag";
import Meta from "../ui/Meta";
import { SEASONS } from "../../constants";
import { hasRefreshableUrl, isStale } from "../../../shared/staleness";
import { formatRelativeDate, hashTone } from "../../lib/format";
import { useClosets } from "../../hooks/useClosets";
import {
  useDeleteItem,
  useFavoriteItem,
  useItem,
  useMoveItem,
  useOptimisticTagUpdate,
  usePatchItem,
  useRefreshItem
} from "../../hooks/useItems";
import { useTags } from "../../hooks/useTags";
import { useIsMobile } from "../../hooks/useMediaQuery";

export default function ItemDrawer({
  itemId,
  onClose
}: {
  itemId: string | null;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const itemQuery = useItem(itemId ?? undefined);
  const closetsQuery = useClosets();
  const tagsQuery = useTags();
  const patchMutation = usePatchItem();
  const favoriteMutation = useFavoriteItem();
  const moveMutation = useMoveItem();
  const deleteMutation = useDeleteItem();
  const refreshMutation = useRefreshItem();
  const { updateItemTags, isPending: isTagPending } = useOptimisticTagUpdate();
  const [newTag, setNewTag] = useState("");
  const [moveClosetId, setMoveClosetId] = useState("");
  const [moveSectionId, setMoveSectionId] = useState("");
  const item = itemQuery.data;
  const closets = closetsQuery.data ?? [];
  const moveCloset = closets.find((closet) => closet.id === moveClosetId) ?? closets.find((closet) => closet.id === item?.closetId);
  const availableSections = moveCloset?.sections ?? [];
  const suggestedTags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const refreshableUrl = hasRefreshableUrl(item?.url ?? null);
  const stale = item ? isStale(item.lastCheckedAt, item.url) : false;

  useEffect(() => {
    if (item) {
      setMoveClosetId(item.closetId);
      setMoveSectionId(item.sectionId ?? "");
    }
  }, [item]);

  if (!itemId) {
    return null;
  }

  return (
    <Modal open={Boolean(itemId)} onClose={onClose} width={580} align="right" panelStyle={isMobile ? undefined : { height: "100vh" }}>
      {!item ? (
        <div style={{ padding: 32, color: "var(--ws-muted)" }}>Loading item...</div>
      ) : (
        <div>
          <div style={{ position: "relative" }}>
            <ProductTile
              tone={hashTone(item.id)}
              imageUrl={item.imageUrl}
              style={{ width: "100%", aspectRatio: "4 / 5" }}
            />
            <button
              type="button"
              onClick={onClose}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                width: 32,
                height: 32,
                borderRadius: 32,
                border: "none",
                background: "var(--ws-overlay-paper)",
                color: "var(--ws-ink)",
                cursor: "pointer",
                fontSize: 14
              }}
            >
              ×
            </button>
          </div>

          <div style={{ padding: isMobile ? "24px 20px 32px" : "28px 32px 40px" }}>
            <Eyebrow>
              {item.closet?.name ?? "Closet"} {item.section?.name ? `· ${item.section.name}` : ""}
            </Eyebrow>
            <div style={{ marginTop: 8, fontFamily: "var(--ws-display)", fontSize: 16, fontStyle: "italic", color: "var(--ws-accent)" }}>
              {item.brand}
            </div>
            <Display size={36} style={{ marginTop: 4 }}>
              {item.name}
            </Display>

            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 16 }}>
              <span style={{ fontFamily: "var(--ws-display)", fontSize: 28, fontWeight: 300 }}>
                {item.price ?? "TBD"}
              </span>
              {item.originalPrice ? (
                <span
                  style={{
                    fontFamily: "var(--ws-mono)",
                    fontSize: 13,
                    color: "var(--ws-muted)",
                    textDecoration: "line-through"
                  }}
                >
                  {item.originalPrice}
                </span>
              ) : null}
              {item.onSale ? (
                <span
                  style={{
                    alignSelf: "center",
                    padding: "4px 7px",
                    background: "var(--ws-accent)",
                    color: "var(--ws-paper)",
                    fontFamily: "var(--ws-mono)",
                    fontSize: 9,
                    letterSpacing: 0.8
                  }}
                >
                  ON SALE
                </span>
              ) : null}
            </div>

            {item.description ? (
              <div
                style={{
                  marginTop: 18,
                  fontFamily: "var(--ws-ui)",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "var(--ws-muted)"
                }}
              >
                {item.description}
              </div>
            ) : null}

            {item.note ? (
              <div
                style={{
                  marginTop: 18,
                  padding: "14px 0",
                  borderTop: "1px solid var(--ws-hairline)",
                  borderBottom: "1px solid var(--ws-hairline)"
                }}
              >
                <Eyebrow style={{ marginBottom: 8 }}>Note</Eyebrow>
                <div
                  style={{
                    fontFamily: "var(--ws-ui)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--ws-muted)",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {item.note}
                </div>
              </div>
            ) : null}

            {refreshableUrl ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  marginTop: 18,
                  padding: "14px 0",
                  fontFamily: "var(--ws-ui)",
                  fontSize: 13,
                  color: "var(--ws-muted)"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
                  <span>Price and stock</span>
                  <span style={{ fontFamily: "var(--ws-mono)", fontSize: 11 }}>
                    {item.lastCheckedAt ? formatRelativeDate(item.lastCheckedAt) : "Not checked"}
                  </span>
                </div>
                {stale ? (
                  <div style={{ color: "var(--ws-accent)" }}>
                    This price or stock info may be stale.
                  </div>
                ) : null}
                {item.inStock !== null ? (
                  <div
                    style={{
                      fontFamily: "var(--ws-mono)",
                      fontSize: 11,
                      color: item.inStock ? "#4F7A5A" : "var(--ws-accent)",
                      letterSpacing: 0.5,
                      textTransform: "uppercase"
                    }}
                  >
                    {item.inStock ? "In Stock" : "Out of Stock"}
                  </div>
                ) : null}
              </div>
            ) : null}

            <Hairline style={{ margin: "24px 0 18px" }} />
            <Eyebrow style={{ marginBottom: 10 }}>Season · required</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SEASONS.map((season) => (
                <Tag
                  key={season}
                  season
                  filled={item.season === season}
                  onClick={() => void patchMutation.mutateAsync({ id: item.id, payload: { season } })}
                >
                  {season}
                </Tag>
              ))}
            </div>

            <Eyebrow style={{ marginTop: 20, marginBottom: 10 }}>Tags</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {item.tags.map((tag) => (
                <Tag
                  key={tag}
                  removable
                  onRemove={() => void updateItemTags(item, item.tags.filter((entry) => entry !== tag))}
                >
                  {tag}
                </Tag>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                value={newTag}
                onChange={(event) => setNewTag(event.target.value)}
                placeholder="Add tag"
                style={{
                  flex: 1,
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-surface)",
                  color: "var(--ws-ink)",
                  padding: "12px 14px"
                }}
              />
              <button
                type="button"
                disabled={!newTag.trim() || isTagPending}
                onClick={() => {
                  const nextTag = newTag.trim();
                  void updateItemTags(item, Array.from(new Set([...item.tags, nextTag])));
                  setNewTag("");
                }}
                style={{
                  padding: "12px 16px",
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-hover-bg, transparent)",
                  cursor: "pointer",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.5
                }}
              >
                Add
              </button>
            </div>

            {suggestedTags.length ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {suggestedTags.slice(0, 10).map((tag) => (
                  <Tag
                    key={tag.id}
                    color={tag.color}
                    filled={item.tags.includes(tag.name)}
                    onClick={() => {
                      const next = item.tags.includes(tag.name)
                        ? item.tags.filter((entry) => entry !== tag.name)
                        : [...item.tags, tag.name];
                      void updateItemTags(item, Array.from(new Set(next)));
                    }}
                  >
                    {tag.name}
                  </Tag>
                ))}
              </div>
            ) : null}

            <Hairline style={{ margin: "24px 0 18px" }} />
            <Eyebrow style={{ marginBottom: 12 }}>Move</Eyebrow>
            <div style={{ display: "grid", gap: 10 }}>
              <select
                value={moveClosetId}
                onChange={(event) => {
                  setMoveClosetId(event.target.value);
                  setMoveSectionId("");
                }}
                style={{
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-surface)",
                  color: "var(--ws-ink)",
                  padding: "12px 14px"
                }}
              >
                {closets.map((closet) => (
                  <option key={closet.id} value={closet.id}>
                    {closet.name}
                  </option>
                ))}
              </select>
              <select
                value={moveSectionId}
                onChange={(event) => setMoveSectionId(event.target.value)}
                style={{
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-surface)",
                  color: "var(--ws-ink)",
                  padding: "12px 14px"
                }}
              >
                <option value="">No section</option>
                {availableSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void moveMutation.mutateAsync({ id: item.id, closetId: moveClosetId, sectionId: moveSectionId || null })}
                style={{
                  padding: "12px 16px",
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-hover-bg, transparent)",
                  cursor: "pointer",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.5
                }}
              >
                Move item
              </button>
            </div>

            <Hairline style={{ margin: "24px 0 18px" }} />
            <Eyebrow style={{ marginBottom: 12 }}>Details</Eyebrow>
            <Meta
              items={[
                item.source && item.url && /^https?:\/\//i.test(item.url) ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    ↗ {item.source}
                  </a>
                ) : item.source ? `↗ ${item.source}` : null,
                formatRelativeDate(item.addedAt),
                item.colors.join(", "),
                item.favorited ? "Favorited" : null
              ]}
              style={{ display: "grid", gap: 8, fontSize: 12 }}
            />

            <div style={{ display: "flex", gap: 10, marginTop: 32, flexWrap: "wrap" }}>
              {item.url && /^https?:\/\//i.test(item.url) ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    minWidth: 180,
                    textAlign: "center",
                    padding: "14px",
                    background: "var(--ws-ink)",
                    color: "var(--ws-paper)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 1.8
                  }}
                >
                  Visit store ↗
                </a>
              ) : null}

              {refreshableUrl ? (
                <button
                  type="button"
                  disabled={refreshMutation.isPending}
                  onClick={() => void refreshMutation.mutateAsync(item.id)}
                  style={{
                    padding: "14px 18px",
                    border: "1px solid var(--ws-hairline)",
                    background: "var(--ws-hover-bg, transparent)",
                    cursor: refreshMutation.isPending ? "not-allowed" : "pointer",
                    opacity: refreshMutation.isPending ? 0.5 : 1,
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase"
                  }}
                >
                  {refreshMutation.isPending ? "Refreshing..." : "Refresh"}
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => void favoriteMutation.mutateAsync(item.id)}
                style={{
                  padding: "14px 18px",
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-hover-bg, transparent)",
                  cursor: "pointer"
                }}
              >
                {item.favorited ? "♥" : "♡"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`Delete "${item.name}"?`)) {
                    return;
                  }

                  await deleteMutation.mutateAsync(item.id);
                  onClose();
                }}
                style={{
                  padding: "14px 18px",
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-hover-bg, transparent)",
                  cursor: "pointer",
                  color: "var(--ws-accent)",
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase"
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
