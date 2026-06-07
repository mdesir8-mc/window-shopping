import type { Item } from "../../types";
import ItemCard from "./ItemCard";
import { useIsMobile } from "../../hooks/useMediaQuery";

export default function ItemGrid({
  items,
  onOpen,
  onEdit
}: {
  items: Item[];
  onOpen: (item: Item) => void;
  onEdit?: (item: Item) => void;
}) {
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "repeat(auto-fill, minmax(140px, 1fr))" : "repeat(auto-fill, minmax(180px, 260px))",
        gap: isMobile ? 14 : 20
      }}
    >
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onClick={() => onOpen(item)} onEdit={onEdit ? () => onEdit(item) : undefined} />
      ))}
    </div>
  );
}
