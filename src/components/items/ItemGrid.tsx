import type { Item } from "../../types";
import ItemCard from "./ItemCard";

export default function ItemGrid({
  items,
  onOpen,
  onEdit
}: {
  items: Item[];
  onOpen: (item: Item) => void;
  onEdit?: (item: Item) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 20
      }}
    >
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onClick={() => onOpen(item)} onEdit={onEdit ? () => onEdit(item) : undefined} />
      ))}
    </div>
  );
}
