import type { CSSProperties, ReactNode } from "react";
import { useIsMobile } from "../../hooks/useMediaQuery";

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
  const isMobile = useIsMobile();

  if (!open) {
    return null;
  }

  const isMobileDrawer = isMobile && align === "right";

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
        justifyContent: isMobileDrawer ? "center" : align === "right" ? "flex-end" : "center",
        alignItems: isMobileDrawer ? "flex-end" : align === "right" ? "stretch" : isMobile ? "flex-end" : "center",
        padding: isMobile ? 0 : align === "right" ? 0 : 24
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: isMobile ? "100vw" : width,
          maxWidth: isMobile ? "100vw" : "calc(100vw - 32px)",
          maxHeight: isMobile ? "90vh" : align === "right" ? "100vh" : "min(90vh, 880px)",
          background: "var(--ws-paper)",
          border: isMobile ? "none" : align === "right" ? "none" : "1px solid var(--ws-hairline)",
          borderRadius: isMobile ? "16px 16px 0 0" : 0,
          boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
          overflow: "auto",
          animation: isMobile ? "slideInUp 260ms ease-out" : align === "right" ? "slideInRight 260ms ease-out" : undefined,
          ...panelStyle
        }}
      >
        {children}
      </div>
    </div>
  );
}
