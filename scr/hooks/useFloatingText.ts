import { useCallback, useEffect, useRef, useState } from 'react';

export interface FloatingTextItem {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

let counter = 0;

export function useFloatingText() {
  const [items, setItems] = useState<FloatingTextItem[]>([]);
  const timeouts = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timeouts.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const push = useCallback((text: string, color = '#7CFF5C', x = 50, y = 50) => {
    const id = counter++;
    setItems((prev) => [...prev, { id, text, color, x, y }]);
    const timeoutId = window.setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }, 1100);
    timeouts.current.push(timeoutId);
  }, []);

  return { items, push };
}
