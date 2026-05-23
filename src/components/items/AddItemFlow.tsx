import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import Eyebrow from "../ui/Eyebrow";
import Display from "../ui/Display";
import ProductTile from "../ui/ProductTile";
import Tag from "../ui/Tag";
import { useClosets } from "../../hooks/useClosets";
import { useCreateItem, useParseUrl } from "../../hooks/useItems";
import { useTags } from "../../hooks/useTags";
import { SEASONS } from "../../constants";
import { hashTone } from "../../lib/format";
import type { ParsedProduct } from "../../types";

type Step = "paste" | "parsing" | "preview";

export default function AddItemFlow({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closetsQuery = useClosets();
  const tagsQuery = useTags();
  const parseMutation = useParseUrl();
  const createMutation = useCreateItem();
  const [step, setStep] = useState<Step>("paste");
  const [url, setUrl] = useState("");
  const [parsed, setParsed] = useState<ParsedProduct | null>(null);
  const [closetId, setClosetId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [season, setSeason] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const closets = closetsQuery.data ?? [];
  const selectedCloset = closets.find((closet) => closet.id === closetId) ?? closets[0];
  const availableSections = selectedCloset?.sections ?? [];

  useEffect(() => {
    if (!open) {
      setStep("paste");
      setUrl("");
      setParsed(null);
      setClosetId("");
      setSectionId("");
      setSeason("");
      setSelectedTags([]);
      setCustomTag("");
      return;
    }

    if (!closetId && closets[0]) {
      setClosetId(closets[0].id);
    }
  }, [closetId, closets, open]);

  const suggestedTags = useMemo(() => {
    const known = new Set((tagsQuery.data ?? []).map((tag) => tag.name));
    const parsedTags = parsed?.suggestedTags ?? [];
    return Array.from(new Set([...parsedTags, ...Array.from(known)]));
  }, [parsed?.suggestedTags, tagsQuery.data]);

  async function handleClipboardPaste() {
    try {
      const clipboard = await navigator.clipboard.readText();
      if (clipboard) {
        setUrl(clipboard);
      }
    } catch {
      // Ignore clipboard errors and let manual input continue.
    }
  }

  async function handleParse(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("parsing");

    try {
      const result = await parseMutation.mutateAsync(url);
      setParsed(result);
      setSelectedTags(result.suggestedTags);
      setSeason(result.suggestedSeason ?? selectedCloset?.season ?? "");
      setStep("preview");
    } catch {
      setStep("paste");
    }
  }

  async function handleSave() {
    if (!parsed || !selectedCloset || !season) {
      return;
    }

    const finalTags = customTag
      ? Array.from(new Set([...selectedTags, customTag.trim()])).filter(Boolean)
      : selectedTags;

    await createMutation.mutateAsync({
      closetId: selectedCloset.id,
      sectionId: sectionId || null,
      brand: parsed.brand ?? parsed.source,
      name: parsed.name ?? "Untitled product",
      season,
      price: parsed.price,
      originalPrice: parsed.originalPrice,
      currency: parsed.currency,
      source: parsed.source,
      url,
      tags: finalTags,
      colors: parsed.colors,
      description: parsed.description,
      imageUrl: parsed.imageUrl
    });

    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} width={680}>
      <div style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <Eyebrow>Add item</Eyebrow>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "var(--ws-muted)"
            }}
          >
            Cancel
          </button>
        </div>

        <Display size={38} style={{ marginTop: 14 }}>
          Paste a link.
          <br />
          <em style={{ fontStyle: "italic", fontWeight: 300, color: "var(--ws-accent)" }}>
            We&apos;ll handle it.
          </em>
        </Display>

        <form onSubmit={handleParse}>
          <div
            style={{
              marginTop: 24,
              padding: "18px 16px",
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)"
            }}
          >
            <Eyebrow style={{ marginBottom: 8 }}>URL</Eyebrow>
            <textarea
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://"
              rows={3}
              style={{
                width: "100%",
                border: "none",
                padding: 0,
                resize: "vertical",
                background: "transparent",
                color: "var(--ws-ink)",
                fontFamily: "var(--ws-mono)",
                fontSize: 13
              }}
            />
          </div>

          {step === "paste" ? (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => void handleClipboardPaste()}
                style={{
                  padding: "14px 16px",
                  border: "1px solid var(--ws-hairline)",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.5
                }}
              >
                Paste link
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: "14px 16px",
                  border: "none",
                  background: "var(--ws-ink)",
                  color: "var(--ws-paper)",
                  cursor: "pointer",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 1.8
                }}
              >
                Read the page
              </button>
            </div>
          ) : null}
        </form>

        {parseMutation.isError ? (
          <div style={{ marginTop: 12, color: "var(--ws-accent)", fontSize: 13 }}>
            Unable to parse that link. Try a direct product page URL.
          </div>
        ) : null}

        {step === "parsing" ? (
          <div
            style={{
              marginTop: 24,
              padding: "44px 20px",
              border: "1px solid var(--ws-hairline)",
              textAlign: "center"
            }}
          >
            <div
              style={{
                fontFamily: "var(--ws-mono)",
                fontSize: 10,
                letterSpacing: 1,
                color: "var(--ws-muted)",
                marginBottom: 18
              }}
            >
              PARSING
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 16 }}>
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 6,
                    background: "var(--ws-accent)",
                    animation: `bounce 1.2s ${index * 0.15}s ease infinite`
                  }}
                />
              ))}
            </div>
            <div style={{ fontFamily: "var(--ws-display)", fontSize: 18, fontWeight: 300 }}>Reading the page...</div>
            <div style={{ marginTop: 4, fontFamily: "var(--ws-ui)", fontSize: 12, color: "var(--ws-muted)" }}>
              Image · price · brand · materials
            </div>
          </div>
        ) : null}

        {step === "preview" && parsed ? (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                fontFamily: "var(--ws-mono)",
                fontSize: 10,
                letterSpacing: 1,
                color: "var(--ws-accent)",
                marginBottom: 12
              }}
            >
              ✓ PARSED
            </div>

            <div style={{ display: "flex", gap: 14, padding: 12, border: "1px solid var(--ws-hairline)" }}>
              <ProductTile
                tone={hashTone(url)}
                imageUrl={parsed.imageUrl}
                size={88}
                rounded={2}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "var(--ws-display)",
                    fontSize: 12,
                    fontStyle: "italic",
                    color: "var(--ws-accent)"
                  }}
                >
                  {parsed.brand ?? parsed.source}
                </div>
                <div style={{ marginTop: 2, fontFamily: "var(--ws-display)", fontSize: 18, fontWeight: 300 }}>
                  {parsed.name ?? "Untitled product"}
                </div>
                <div style={{ marginTop: 6, fontFamily: "var(--ws-mono)", fontSize: 11 }}>
                  {[parsed.price, parsed.currency].filter(Boolean).join(" ") || "Price unavailable"}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 18, marginTop: 22 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <Eyebrow>Save to closet</Eyebrow>
                <select
                  value={closetId}
                  onChange={(event) => {
                    const nextClosetId = event.target.value;
                    setClosetId(nextClosetId);
                    setSectionId("");
                    if (!season) {
                      const nextCloset = closets.find((closet) => closet.id === nextClosetId);
                      setSeason(nextCloset?.season ?? "");
                    }
                  }}
                  style={{
                    border: "1px solid var(--ws-hairline)",
                    background: "var(--ws-surface)",
                    color: "var(--ws-ink)",
                    padding: "14px 16px"
                  }}
                >
                  {closets.map((closet) => (
                    <option key={closet.id} value={closet.id}>
                      {closet.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <Eyebrow>Section</Eyebrow>
                <select
                  value={sectionId}
                  onChange={(event) => setSectionId(event.target.value)}
                  style={{
                    border: "1px solid var(--ws-hairline)",
                    background: "var(--ws-surface)",
                    color: "var(--ws-ink)",
                    padding: "14px 16px"
                  }}
                >
                  <option value="">No section</option>
                  {availableSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>
              Season <span style={{ color: "var(--ws-accent)" }}>* required</span>
            </Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SEASONS.map((entry) => (
                <Tag
                  key={entry}
                  season
                  filled={season === entry}
                  onClick={() => setSeason(entry)}
                >
                  {entry}
                </Tag>
              ))}
            </div>

            <Eyebrow style={{ marginTop: 22, marginBottom: 10 }}>Suggested tags</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {suggestedTags.slice(0, 12).map((tag) => (
                <Tag
                  key={tag}
                  filled={selectedTags.includes(tag)}
                  onClick={() =>
                    setSelectedTags((current) =>
                      current.includes(tag) ? current.filter((entry) => entry !== tag) : [...current, tag]
                    )
                  }
                >
                  {tag}
                </Tag>
              ))}
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 18 }}>
              <Eyebrow>Custom tag</Eyebrow>
              <input
                value={customTag}
                onChange={(event) => setCustomTag(event.target.value)}
                placeholder="quiet luxury"
                style={{
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-surface)",
                  color: "var(--ws-ink)",
                  padding: "14px 16px"
                }}
              />
            </div>

            <button
              type="button"
              disabled={!season || createMutation.isPending || !selectedCloset}
              onClick={() => void handleSave()}
              style={{
                width: "100%",
                marginTop: 28,
                padding: "16px",
                border: "none",
                background: "var(--ws-ink)",
                color: "var(--ws-paper)",
                cursor: !season || createMutation.isPending || !selectedCloset ? "not-allowed" : "pointer",
                opacity: !season || createMutation.isPending || !selectedCloset ? 0.4 : 1,
                textTransform: "uppercase",
                letterSpacing: 1.8,
                fontSize: 11
              }}
            >
              Save to {selectedCloset?.name ?? "closet"}
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
