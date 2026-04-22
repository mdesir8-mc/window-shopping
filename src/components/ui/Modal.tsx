import type { CSSProperties, ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number | string;
  panelStyle?: CSSProperties;
  align?: "center" | "right";
}

export default function Modal({
  open,
  onClose,
  children,
  width = 640,
  panelStyle,
  align = "center"
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(26,22,19,0.35)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: align === "right" ? "flex-end" : "center",
        alignItems: align === "right" ? "stretch" : "center",
        padding: align === "right" ? 0 : 24
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: align === "right" ? "100vh" : "min(90vh, 880px)",
          background: "var(--ws-paper)",
          border: align === "right" ? "none" : "1px solid var(--ws-hairline)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
          overflow: "auto",
          ...panelStyle
        }}
      >
        {children}
      </div>
    </div>
  );
}
