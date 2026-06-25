import type { FloatingTextItem } from '../hooks/useFloatingText';

export default function FloatingTextLayer({ items }: { items: FloatingTextItem[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((item) => (
        <span
          key={item.id}
          className="floating-text text-base"
          style={{ left: `${item.x}%`, top: `${item.y}%`, color: item.color }}
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}
