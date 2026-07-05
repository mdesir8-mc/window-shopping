import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import Tag from "../components/ui/Tag";
import ItemGrid from "../components/items/ItemGrid";
import ProductTile from "../components/ui/ProductTile";
import Modal from "../components/ui/Modal";
import { useAppShell } from "../components/layout/AppShell";
import {
  useCloset,
  useCreateSection,
  useDeleteSection,
  useDisableShare,
  useEnableShare,
  usePatchSection
} from "../hooks/useClosets";
import { useItems } from "../hooks/useItems";
import { useIsMobile } from "../hooks/useMediaQuery";
import { formatCompactCurrency, hashTone, lightenHex, parsePriceToNumber } from "../lib/format";
import { downloadClosetExport, type ExportFormat } from "../api/export";
import type { ItemFilters } from "../types";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "updated", label: "Recently updated" },
  { value: "price-asc", label: "Price ↑" },
  { value: "price-desc", label: "Price ↓" }
] as const;

type ItemSort = (typeof SORT_OPTIONS)[number]["value"];

function getSortParam(value: string | null): ItemSort {
  return SORT_OPTIONS.some((option) => option.value === value) ? (value as ItemSort) : "newest";
}

export default function ClosetDetail() {
  const isMobile = useIsMobile();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openItemDrawer, openClosetForm, openItemForm, openAddItem, showToast } = useAppShell();
  const closetQuery = useCloset(id);
  const createSectionMutation = useCreateSection();
  const patchSectionMutation = usePatchSection();
  const deleteSectionMutation = useDeleteSection();
  const enableShareMutation = useEnableShare();
  const disableShareMutation = useDisableShare();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const closet = closetQuery.data;
  const search = searchParams.get("search") ?? "";
  const season = searchParams.get("season");
  const sort = getSortParam(searchParams.get("sort"));
  const onSaleFilter = searchParams.get("onSale") === "true";
  const inStockFilter = searchParams.get("inStock") === "true";
  const itemsQuery = useItems({
    closetId: id,
    sectionId: activeSection,
    search,
    season,
    sort: sort as ItemFilters["sort"],
    onSale: onSaleFilter ? true : undefined,
    inStock: inStockFilter ? true : undefined
  });
  const items = itemsQuery.data ?? [];
  const activeSectionObject = closet?.sections.find((section) => section.id === activeSection) ?? null;
  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + parsePriceToNumber(item.price), 0),
    [items]
  );
  const onSaleCount = useMemo(
    () => items.filter((item) => item.onSale).length,
    [items]
  );
  const outOfStockCount = useMemo(
    () => items.filter((item) => item.inStock === false).length,
    [items]
  );
  const hasActiveItemFilters = Boolean(search || season || onSaleFilter || inStockFilter);

  function setUrlParam(key: string, value: string | null) {
    const nextParams = new URLSearchParams(searchParams);

    if (value) {
      nextParams.set(key, value);
    } else {
      nextParams.delete(key);
    }

    setSearchParams(nextParams, { replace: true });
  }

  function handleSortChange(value: ItemSort) {
    setUrlParam("sort", value === "newest" ? null : value);
  }

  async function handleClosetExport(format: ExportFormat) {
    if (!closet) {
      return;
    }

    setExportingFormat(format);

    try {
      await downloadClosetExport(closet.id, closet.name, format);
      showToast(`${format.toUpperCase()} export started.`);
    } catch {
      showToast("Couldn't export this closet. Try again shortly.");
    } finally {
      setExportingFormat(null);
    }
  }

  const shareUrl =
    closet?.shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/share/${closet.shareToken}`
      : null;

  async function handleEnableShare() {
    if (!closet) {
      return;
    }

    try {
      await enableShareMutation.mutateAsync(closet.id);
    } catch {
      showToast("Couldn't create a share link. Try again shortly.");
    }
  }

  async function handleDisableShare() {
    if (!closet) {
      return;
    }

    try {
      await disableShareMutation.mutateAsync(closet.id);
      showToast("Sharing turned off.");
    } catch {
      showToast("Couldn't turn off sharing. Try again shortly.");
    }
  }

  async function handleCopyShareUrl() {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Link copied.");
    } catch {
      showToast("Couldn't copy. Copy it manually.");
    }
  }

  if (!closet) {
    return <div style={{ padding: isMobile ? 20 : 40, color: "var(--ws-muted)" }}>Loading closet...</div>;
  }

  const closetId = closet.id;
  const sections = closet.sections;
  const sectionIndex = activeSectionObject
    ? sections.findIndex((section) => section.id === activeSectionObject.id)
    : -1;
  const canMoveEarlier = sectionIndex > 0;
  const canMoveLater = sectionIndex >= 0 && sectionIndex < sections.length - 1;

  async function moveSection(direction: -1 | 1) {
    if (!activeSectionObject || sectionIndex < 0) {
      return;
    }

    const target = sections[sectionIndex + direction];
    if (!target) {
      return;
    }

    await Promise.all([
      patchSectionMutation.mutateAsync({
        closetId,
        sectionId: activeSectionObject.id,
        payload: { order: sectionIndex + direction }
      }),
      patchSectionMutation.mutateAsync({
        closetId,
        sectionId: target.id,
        payload: { order: sectionIndex }
      })
    ]);
  }

  async function handleSectionSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeSectionObject) {
      await patchSectionMutation.mutateAsync({
        closetId,
        sectionId: activeSectionObject.id,
        payload: { name: sectionName }
      });
    } else {
      await createSectionMutation.mutateAsync({
        closetId,
        payload: { name: sectionName }
      });
    }

    setSectionModalOpen(false);
    setSectionName("");
  }

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 320px",
          gap: isMobile ? 24 : 40,
          paddingBottom: isMobile ? 24 : 32,
          borderBottom: "1px solid var(--ws-hairline)",
          marginBottom: isMobile ? 24 : 32
        }}
      >
        <div>
          <Eyebrow>Closet</Eyebrow>
          <Display size={68} style={{ marginTop: 12, marginBottom: 10 }}>
            {closet.name}
          </Display>
          <div style={{ maxWidth: 520, fontSize: 15, lineHeight: 1.6, color: "var(--ws-muted)" }}>
            {closet.subtitle ?? "An evolving, tag-indexed edit of the pieces you return to."}
          </div>

          <div style={{ display: "flex", gap: isMobile ? 16 : 24, flexWrap: "wrap", marginTop: 24 }}>
            {[
              { value: closet.itemCount, label: "items" },
              { value: closet.sections.length, label: "sections" },
              { value: closet.tags.length, label: "tags" },
              { value: formatCompactCurrency(totalValue), label: "value" },
              { value: onSaleCount, label: "on sale" },
              { value: outOfStockCount, label: "out of stock" }
            ].map((entry) => (
              <div key={entry.label}>
                <div style={{ fontFamily: "var(--ws-display)", fontSize: 22, fontWeight: 300 }}>{entry.value}</div>
                <Eyebrow>{entry.label}</Eyebrow>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 20 }}>
            <Eyebrow style={{ marginBottom: 8 }}>Closet tags</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {closet.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: isMobile ? "wrap" : "nowrap" }}>
            <button
              type="button"
              onClick={() => openClosetForm(closet)}
              style={{
                padding: "10px 14px",
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-hover-bg, transparent)",
                cursor: "pointer",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase"
              }}
            >
              Edit closet
            </button>
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              style={{
                padding: "10px 14px",
                border: "1px solid var(--ws-hairline)",
                background: closet.shareToken ? "var(--ws-accent)" : "var(--ws-hover-bg, transparent)",
                color: closet.shareToken ? "var(--ws-paper)" : "inherit",
                cursor: "pointer",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase"
              }}
            >
              {closet.shareToken ? "Shared" : "Share"}
            </button>
            {(["csv", "json"] as const).map((format) => (
              <button
                key={format}
                type="button"
                disabled={exportingFormat !== null}
                onClick={() => void handleClosetExport(format)}
                style={{
                  padding: "10px 14px",
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-hover-bg, transparent)",
                  cursor: exportingFormat !== null ? "default" : "pointer",
                  opacity: exportingFormat !== null && exportingFormat !== format ? 0.55 : 1,
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: "uppercase"
                }}
              >
                {exportingFormat === format ? "Exporting" : `Export ${format.toUpperCase()}`}
              </button>
            ))}
            {activeSectionObject ? (
              <>
                <button
                  type="button"
                  disabled={!canMoveEarlier || patchSectionMutation.isPending}
                  onClick={() => void moveSection(-1)}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid var(--ws-hairline)",
                    background: "var(--ws-hover-bg, transparent)",
                    cursor: !canMoveEarlier || patchSectionMutation.isPending ? "default" : "pointer",
                    opacity: canMoveEarlier ? 1 : 0.4,
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase"
                  }}
                >
                  ◀ Move
                </button>
                <button
                  type="button"
                  disabled={!canMoveLater || patchSectionMutation.isPending}
                  onClick={() => void moveSection(1)}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid var(--ws-hairline)",
                    background: "var(--ws-hover-bg, transparent)",
                    cursor: !canMoveLater || patchSectionMutation.isPending ? "default" : "pointer",
                    opacity: canMoveLater ? 1 : 0.4,
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase"
                  }}
                >
                  Move ▶
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSectionName(activeSectionObject.name);
                    setSectionModalOpen(true);
                  }}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid var(--ws-hairline)",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase"
                  }}
                >
                  Rename section
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const deleteItems = window.confirm(
                      `Delete "${activeSectionObject.name}" and its items? Press Cancel to keep the section.`
                    );

                    if (!deleteItems) {
                      return;
                    }

                    await deleteSectionMutation.mutateAsync({
                      closetId: closet.id,
                      sectionId: activeSectionObject.id,
                      deleteItems: true
                    });
                    setActiveSection(null);
                  }}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid var(--ws-hairline)",
                    background: "var(--ws-hover-bg, transparent)",
                    cursor: "pointer",
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase",
                    color: "var(--ws-accent)"
                  }}
                >
                  Delete section
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ position: "relative", height: isMobile ? "auto" : 280, display: isMobile ? "flex" : "block", gap: isMobile ? 10 : undefined }}>
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              style={{
                position: isMobile ? "relative" : "absolute",
                top: isMobile ? undefined : index * 30,
                left: isMobile ? undefined : 40 + index * 70,
                width: isMobile ? "33%" : index === 0 ? 180 : index === 1 ? 100 : 110,
                height: isMobile ? undefined : index === 0 ? 220 : index === 1 ? 130 : 90,
                aspectRatio: isMobile ? "3 / 4" : undefined,
                flex: isMobile ? 1 : undefined
              }}
            >
              <ProductTile
                tone={hashTone(`${closet.id}-${index}`)}
                gradientColors={closet.accent ? [lightenHex(closet.accent, 0.55), lightenHex(closet.accent, 0.10)] : undefined}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          marginBottom: 24,
          borderBottom: "1px solid var(--ws-hairline)",
          paddingBottom: 12,
          flexWrap: "wrap"
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSection(null)}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            padding: 0,
            fontFamily: "var(--ws-display)",
            fontSize: 18,
            fontStyle: activeSection === null ? "italic" : "normal",
            color: activeSection === null ? "var(--ws-ink)" : "var(--ws-muted)"
          }}
        >
          All <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10 }}>{closet.itemCount}</span>
        </button>
        {closet.sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
            style={{
              border: "none",
              background: "var(--ws-hover-bg, transparent)",
              cursor: "pointer",
              padding: 0,
              fontFamily: "var(--ws-display)",
              fontSize: 18,
              fontStyle: activeSection === section.id ? "italic" : "normal",
              color: activeSection === section.id ? "var(--ws-ink)" : "var(--ws-muted)"
            }}
          >
            {section.name} <span style={{ fontFamily: "var(--ws-mono)", fontSize: 10 }}>{section.itemCount}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setSectionName("");
            setSectionModalOpen(true);
          }}
          style={{
            border: "1px dashed var(--ws-hairline)",
            background: "var(--ws-hover-bg, transparent)",
            padding: "4px 10px",
            cursor: "pointer",
            fontSize: 10,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "var(--ws-muted)"
          }}
        >
          + Section
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 24,
          flexDirection: isMobile ? "column" : "row"
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--ws-mono)",
            fontSize: 10,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            color: "var(--ws-muted)"
          }}
        >
          Sort
          <select
            value={sort}
            onChange={(event) => handleSortChange(event.target.value as ItemSort)}
            style={{
              minWidth: 168,
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-hover-bg, transparent)",
              color: "var(--ws-ink)",
              cursor: "pointer",
              padding: "9px 12px",
              fontFamily: "var(--ws-ui)",
              fontSize: 12
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setUrlParam("onSale", onSaleFilter ? null : "true")}
            style={{
              padding: "9px 12px",
              border: "1px solid var(--ws-hairline)",
              background: onSaleFilter ? "var(--ws-ink)" : "var(--ws-hover-bg, transparent)",
              color: onSaleFilter ? "var(--ws-paper)" : "var(--ws-ink)",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase"
            }}
          >
            On sale
          </button>
          <button
            type="button"
            onClick={() => setUrlParam("inStock", inStockFilter ? null : "true")}
            style={{
              padding: "9px 12px",
              border: "1px solid var(--ws-hairline)",
              background: inStockFilter ? "var(--ws-ink)" : "var(--ws-hover-bg, transparent)",
              color: inStockFilter ? "var(--ws-paper)" : "var(--ws-ink)",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase"
            }}
          >
            In stock
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        search ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ws-muted)", fontSize: 14 }}>
            No items match your search.
          </div>
        ) : hasActiveItemFilters ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ws-muted)", fontSize: 14 }}>
            No items match these filters.
          </div>
        ) : activeSectionObject ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ws-muted)", fontSize: 14 }}>
            Nothing in “{activeSectionObject.name}” yet.
          </div>
        ) : (
          <div style={{ padding: isMobile ? "32px 0" : "60px 40px", maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
            <div style={{ padding: isMobile ? "44px 20px" : "60px 40px", border: "1px dashed var(--ws-hairline)" }}>
              <Eyebrow>Empty closet</Eyebrow>
              <Display size={40} style={{ marginTop: 16, marginBottom: 10 }}>
                Nothing here
                <em style={{ fontStyle: "italic", color: "var(--ws-accent)", fontWeight: 300 }}> yet</em>.
              </Display>
              <div style={{ maxWidth: 420, margin: "0 auto 28px", fontSize: 14, lineHeight: 1.6, color: "var(--ws-muted)" }}>
                Paste a product link to save your first piece into this closet.
              </div>
              <button
                type="button"
                onClick={openAddItem}
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
                Add your first item
              </button>
            </div>
          </div>
        )
      ) : (
        <ItemGrid items={items} onOpen={(item) => openItemDrawer(item.id)} onEdit={(item) => openItemForm(item)} />
      )}

      <Modal open={sectionModalOpen} onClose={() => setSectionModalOpen(false)} width={480}>
        <form onSubmit={handleSectionSave} style={{ padding: 28 }}>
          <Eyebrow>{activeSectionObject ? "Rename section" : "New section"}</Eyebrow>
          <Display size={30} style={{ marginTop: 10 }}>
            {activeSectionObject ? activeSectionObject.name : "Create a section"}
          </Display>
          <input
            required
            value={sectionName}
            onChange={(event) => setSectionName(event.target.value)}
            placeholder="Knitwear"
            style={{
              width: "100%",
              marginTop: 18,
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)",
              padding: "14px 16px"
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button
              type="button"
              onClick={() => setSectionModalOpen(false)}
              style={{
                padding: "10px 14px",
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-hover-bg, transparent)",
                cursor: "pointer",
                fontSize: 11,
                letterSpacing: 1.5,
                textTransform: "uppercase"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: "10px 14px",
                border: "none",
                background: "var(--ws-ink)",
                color: "var(--ws-paper)",
                cursor: "pointer",
                fontSize: 11,
                letterSpacing: 1.8,
                textTransform: "uppercase"
              }}
            >
              Save section
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={shareModalOpen} onClose={() => setShareModalOpen(false)} width={480}>
        <div style={{ padding: 28 }}>
          <Eyebrow>Share closet</Eyebrow>
          <Display size={30} style={{ marginTop: 10 }}>
            {closet.shareToken ? "Anyone with the link" : "Share this closet"}
          </Display>
          <p style={{ marginTop: 12, fontFamily: "var(--ws-ui)", fontSize: 13, color: "var(--ws-muted)" }}>
            {closet.shareToken
              ? "Anyone with this link can view this closet — read-only, no account needed. Turn off sharing to disable the link."
              : "Create a private link to a read-only view of this closet. No sign-in required for viewers. You can turn it off anytime."}
          </p>

          {closet.shareToken && shareUrl ? (
            <>
              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 8,
                  alignItems: "stretch"
                }}
              >
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.target.select()}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "1px solid var(--ws-hairline)",
                    background: "var(--ws-surface)",
                    padding: "12px 14px",
                    fontFamily: "var(--ws-mono)",
                    fontSize: 12
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleCopyShareUrl()}
                  style={{
                    padding: "10px 14px",
                    border: "none",
                    background: "var(--ws-ink)",
                    color: "var(--ws-paper)",
                    cursor: "pointer",
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase"
                  }}
                >
                  Copy
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
                <button
                  type="button"
                  disabled={disableShareMutation.isPending}
                  onClick={() => void handleDisableShare()}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid var(--ws-hairline)",
                    background: "var(--ws-hover-bg, transparent)",
                    cursor: disableShareMutation.isPending ? "default" : "pointer",
                    fontSize: 11,
                    letterSpacing: 1.5,
                    textTransform: "uppercase"
                  }}
                >
                  {disableShareMutation.isPending ? "Turning off" : "Stop sharing"}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button
                type="button"
                disabled={enableShareMutation.isPending}
                onClick={() => void handleEnableShare()}
                style={{
                  padding: "10px 14px",
                  border: "none",
                  background: "var(--ws-ink)",
                  color: "var(--ws-paper)",
                  cursor: enableShareMutation.isPending ? "default" : "pointer",
                  fontSize: 11,
                  letterSpacing: 1.8,
                  textTransform: "uppercase"
                }}
              >
                {enableShareMutation.isPending ? "Creating" : "Create link"}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
