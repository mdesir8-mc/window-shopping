import { useEffect, useMemo, useState } from "react";
import type { Item } from "../../types";
import Modal from "../ui/Modal";
import Display from "../ui/Display";
import Eyebrow from "../ui/Eyebrow";
import Hairline from "../ui/Hairline";
import Tag from "../ui/Tag";
import { usePatchItem } from "../../hooks/useItems";
import { useTags } from "../../hooks/useTags";
import { useSections } from "../../hooks/useClosets";
import { useIsMobile } from "../../hooks/useMediaQuery";

interface ItemFormModalProps {
  open: boolean;
  item: Item | null;
  onClose: () => void;
}

function normalizeTags(raw: string) {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

export default function ItemFormModal({ open, item, onClose }: ItemFormModalProps) {
  const isMobile = useIsMobile();
  const tagsQuery = useTags();
  const sectionsQuery = useSections(item?.closetId);
  const patchMutation = usePatchItem();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [tagText, setTagText] = useState("");
  const [sectionId, setSectionId] = useState("");
  const suggestedTags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);
  const sections = useMemo(() => sectionsQuery.data ?? [], [sectionsQuery.data]);

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setBrand(item?.brand ?? "");
    setPrice(item?.price ?? "");
    setTagText(item?.tags.join(", ") ?? "");
    setSectionId(item?.sectionId ?? "");
  }, [item, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    await patchMutation.mutateAsync({
      id: item.id,
      payload: {
        name,
        brand,
        price: price || null,
        tags: normalizeTags(tagText),
        sectionId: sectionId || null
      }
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} width={640}>
      <form onSubmit={handleSubmit} style={{ padding: isMobile ? 20 : 28 }}>
        <Eyebrow>Edit item</Eyebrow>
        <Display size={36} style={{ marginTop: 10 }}>
          {item?.name ?? ""}
        </Display>

        <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Name</Eyebrow>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Linen Blazer"
              style={{
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-surface)",
                color: "var(--ws-ink)",
                padding: "14px 16px"
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Brand</Eyebrow>
            <input
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="Arket"
              style={{
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-surface)",
                color: "var(--ws-ink)",
                padding: "14px 16px"
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Price</Eyebrow>
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="249.00"
              style={{
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-surface)",
                color: "var(--ws-ink)",
                padding: "14px 16px"
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Tags</Eyebrow>
            <input
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              placeholder="minimalist, linen, workwear"
              style={{
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-surface)",
                color: "var(--ws-ink)",
                padding: "14px 16px"
              }}
            />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Section</Eyebrow>
            <select
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              style={{
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-surface)",
                color: "var(--ws-ink)",
                padding: "14px 16px",
                fontFamily: "var(--ws-ui)",
                fontSize: 13
              }}
            >
              <option value="">No section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {suggestedTags.length ? (
          <>
            <Hairline style={{ margin: "24px 0 18px" }} />
            <Eyebrow style={{ marginBottom: 10 }}>Suggested tags</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {suggestedTags.map((tag) => {
                const active = normalizeTags(tagText).includes(tag.name);
                return (
                  <Tag
                    key={tag.id}
                    filled={active}
                    color={tag.color}
                    onClick={() => {
                      const current = normalizeTags(tagText);
                      const next = active
                        ? current.filter((entry) => entry !== tag.name)
                        : [...current, tag.name];
                      setTagText(next.join(", "));
                    }}
                  >
                    {tag.name}
                  </Tag>
                );
              })}
            </div>
          </>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 28, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "12px 16px",
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-hover-bg, transparent)",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: 1.5,
              fontSize: 11
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={patchMutation.isPending}
            style={{
              padding: "12px 18px",
              border: "none",
              background: "var(--ws-ink)",
              color: "var(--ws-paper)",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: 1.8,
              fontSize: 11
            }}
          >
            Save item
          </button>
        </div>
      </form>
    </Modal>
  );
}
