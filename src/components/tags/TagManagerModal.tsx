import { useState } from "react";
import Modal from "../ui/Modal";
import Display from "../ui/Display";
import Eyebrow from "../ui/Eyebrow";
import Hairline from "../ui/Hairline";
import { useCreateTag, useDeleteTag, usePatchTag, useTags } from "../../hooks/useTags";
import { useIsMobile } from "../../hooks/useMediaQuery";

export default function TagManagerModal({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const isMobile = useIsMobile();
  const tagsQuery = useTags();
  const createMutation = useCreateTag();
  const patchMutation = usePatchTag();
  const deleteMutation = useDeleteTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8A6B4F");

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createMutation.mutateAsync({ name, color });
    setName("");
  }

  return (
    <Modal open={open} onClose={onClose} width={760}>
      <div style={{ padding: isMobile ? 20 : 28 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
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
        <Eyebrow>Tags</Eyebrow>
        <Display size={36} style={{ marginTop: 10 }}>
          Manage your tag library
        </Display>

        <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 80px auto", gap: 12, marginTop: 24 }}>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="cashmere"
            style={{
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)",
              color: "var(--ws-ink)",
              padding: "14px 16px"
            }}
          />
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            style={{
              width: "100%",
              height: isMobile ? 44 : undefined,
              border: "1px solid var(--ws-hairline)",
              background: "var(--ws-surface)",
              padding: 4
            }}
          />
          <button
            type="submit"
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
            Create
          </button>
        </form>

        <Hairline style={{ margin: "24px 0 18px" }} />

        <div style={{ display: "grid", gap: 10 }}>
          {(tagsQuery.data ?? []).map((tag) => (
            <div
              key={tag.id}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1.2fr 120px 100px auto",
                gap: 12,
                alignItems: isMobile ? "stretch" : "center",
                padding: "14px 16px",
                border: "1px solid var(--ws-hairline)",
                background: "var(--ws-overlay-paper)"
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--ws-display)", fontSize: 22, fontWeight: 300 }}>{tag.name}</div>
                <Eyebrow style={{ marginTop: 4 }}>{tag.itemCount} linked items</Eyebrow>
              </div>

              <input
                type="color"
                defaultValue={tag.color ?? "#8A6B4F"}
                onChange={(event) => {
                  void patchMutation.mutateAsync({ name: tag.name, color: event.target.value });
                }}
                style={{
                  width: "100%",
                  height: 42,
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-surface)",
                  padding: 4
                }}
              />

              <div style={{ fontFamily: "var(--ws-mono)", fontSize: 11, color: "var(--ws-muted)" }}>
                {tag.color ?? "No color"}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete "${tag.name}" everywhere?`)) {
                    void deleteMutation.mutateAsync(tag.name);
                  }
                }}
                style={{
                  justifySelf: isMobile ? "stretch" : "end",
                  padding: "10px 12px",
                  border: "1px solid var(--ws-hairline)",
                  background: "var(--ws-hover-bg, transparent)",
                  cursor: "pointer",
                  fontSize: 11,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "var(--ws-accent)"
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
