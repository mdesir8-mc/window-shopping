import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Closet } from "../../types";
import Modal from "../ui/Modal";
import Display from "../ui/Display";
import Eyebrow from "../ui/Eyebrow";
import Hairline from "../ui/Hairline";
import Tag from "../ui/Tag";
import { useCreateCloset, useDeleteCloset, usePatchCloset } from "../../hooks/useClosets";
import { useTags } from "../../hooks/useTags";
import { SEASONS } from "../../constants";

interface ClosetFormModalProps {
  open: boolean;
  closet?: Closet | null;
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

export default function ClosetFormModal({ open, closet, onClose }: ClosetFormModalProps) {
  const navigate = useNavigate();
  const tagsQuery = useTags();
  const createMutation = useCreateCloset();
  const patchMutation = usePatchCloset();
  const deleteMutation = useDeleteCloset();
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [accent, setAccent] = useState("#8A6B4F");
  const [tagText, setTagText] = useState("");
  const [season, setSeason] = useState("");
  const suggestedTags = useMemo(() => tagsQuery.data ?? [], [tagsQuery.data]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(closet?.name ?? "");
    setSubtitle(closet?.subtitle ?? "");
    setAccent(closet?.accent ?? "#8A6B4F");
    setTagText(closet?.tags.join(", ") ?? "");
    setSeason(closet?.season ?? "");
  }, [closet, open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = {
      name,
      subtitle: subtitle || null,
      accent: accent || null,
      tags: normalizeTags(tagText),
      season: season || null
    };

    if (closet) {
      const nextCloset = await patchMutation.mutateAsync({ id: closet.id, payload });
      navigate(`/closets/${nextCloset.id}`);
    } else {
      const nextCloset = await createMutation.mutateAsync(payload);
      navigate(`/closets/${nextCloset.id}`);
    }

    onClose();
  }

  async function handleDelete() {
    if (!closet || !window.confirm(`Delete "${closet.name}" and all of its items?`)) {
      return;
    }

    await deleteMutation.mutateAsync(closet.id);
    navigate("/");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} width={640}>
      <form onSubmit={handleSubmit} style={{ padding: 28 }}>
        <Eyebrow>{closet ? "Edit closet" : "New closet"}</Eyebrow>
        <Display size={36} style={{ marginTop: 10 }}>
          {closet ? closet.name : "Create a new closet"}
        </Display>

        <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Name</Eyebrow>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Main Wardrobe"
              style={{
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-surface)",
                color: "var(--ws-ink)",
                padding: "14px 16px"
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Subtitle</Eyebrow>
            <input
              value={subtitle}
              onChange={(event) => setSubtitle(event.target.value)}
              placeholder="Everyday staples and repeat-wears"
              style={{
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-surface)",
                color: "var(--ws-ink)",
                padding: "14px 16px"
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Accent</Eyebrow>
            <div style={{ display: "flex", gap: 12 }}>
              <input
                type="color"
                value={accent || "#8A6B4F"}
                onChange={(event) => setAccent(event.target.value)}
                style={{
                  width: 48,
                  height: 48,
                  padding: 4,
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-surface)"
                }}
              />
              <input
                value={accent}
                onChange={(event) => setAccent(event.target.value)}
                placeholder="#8A6B4F"
                style={{
                  flex: 1,
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-surface)",
                  color: "var(--ws-ink)",
                  padding: "14px 16px"
                }}
              />
            </div>
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Tags</Eyebrow>
            <input
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              placeholder="minimalist, neutrals, investment"
              style={{
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-surface)",
                color: "var(--ws-ink)",
                padding: "14px 16px"
              }}
            />
          </label>

          <div style={{ display: "grid", gap: 8 }}>
            <Eyebrow>Default season</Eyebrow>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SEASONS.map((entry) => (
                <Tag
                  key={entry}
                  season
                  filled={season === entry}
                  onClick={() => setSeason(season === entry ? "" : entry)}
                >
                  {entry}
                </Tag>
              ))}
            </div>
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

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 28 }}>
          <div>
            {closet ? (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: "12px 16px",
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-hover-bg, transparent)",
                  color: "var(--ws-accent)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  fontSize: 11
                }}
              >
                Delete closet
              </button>
            ) : null}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
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
              disabled={createMutation.isPending || patchMutation.isPending}
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
              {closet ? "Save closet" : "Create closet"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
