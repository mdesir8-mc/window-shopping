import { useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Display from "../components/ui/Display";
import Eyebrow from "../components/ui/Eyebrow";
import Tag from "../components/ui/Tag";
import ItemGrid from "../components/items/ItemGrid";
import ProductTile from "../components/ui/ProductTile";
import Modal from "../components/ui/Modal";
import { useAppShell } from "../components/layout/AppShell";
import { useCloset, useCreateSection, useDeleteSection, usePatchSection } from "../hooks/useClosets";
import { useItems } from "../hooks/useItems";
import { useIsMobile } from "../hooks/useMediaQuery";
import { formatCompactCurrency, hashTone, lightenHex, parsePriceToNumber } from "../lib/format";

export default function ClosetDetail() {
  const isMobile = useIsMobile();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { openItemDrawer, openClosetForm, openItemForm, openAddItem } = useAppShell();
  const closetQuery = useCloset(id);
  const createSectionMutation = useCreateSection();
  const patchSectionMutation = usePatchSection();
  const deleteSectionMutation = useDeleteSection();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionName, setSectionName] = useState("");
  const closet = closetQuery.data;
  const itemsQuery = useItems({
    closetId: id,
    sectionId: activeSection,
    search: searchParams.get("search") ?? "",
    season: searchParams.get("season"),
    sort: (searchParams.get("sort") as "newest" | "oldest" | "updated" | null) ?? "newest"
  });
  const items = itemsQuery.data ?? [];
  const activeSectionObject = closet?.sections.find((section) => section.id === activeSection) ?? null;
  const totalValue = useMemo(
    () => items.reduce((sum, item) => sum + parsePriceToNumber(item.price), 0),
    [items]
  );

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
              { value: formatCompactCurrency(totalValue), label: "value" }
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

      {items.length === 0 ? (
        searchParams.get("search") ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "var(--ws-muted)", fontSize: 14 }}>
            No items match your search.
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
    </div>
  );
}
