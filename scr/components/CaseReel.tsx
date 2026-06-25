import { useEffect, useRef, useState } from 'react';

export interface ReelItem {
  key: string;
  icon: string;
  label: string;
  color: string;
}

interface CaseReelProps {
  pool: ReelItem[];
  result: ReelItem | null;
  /** Bump this number every time you want to trigger a new spin. */
  trigger: number;
  itemWidth?: number;
  onSettled?: () => void;
}

const REEL_LENGTH = 32;
const TARGET_INDEX = 26;

function buildReel(pool: ReelItem[], result: ReelItem): ReelItem[] {
  const arr: ReelItem[] = [];
  for (let i = 0; i < REEL_LENGTH; i++) {
    arr.push(i === TARGET_INDEX ? result : pool[Math.floor(Math.random() * pool.length)]);
  }
  return arr;
}

export default function CaseReel({ pool, result, trigger, itemWidth = 84, onSettled }: CaseReelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(320);
  const [reel, setReel] = useState<ReelItem[]>(() => buildReel(pool, pool[0]));
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    function measure() {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => {
    if (trigger === 0 || !result) return;
    const newReel = buildReel(pool, result);
    setReel(newReel);
    setAnimate(false);
    setOffset(containerWidth / 2 - itemWidth / 2);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setAnimate(true);
        setOffset(containerWidth / 2 - itemWidth / 2 - TARGET_INDEX * itemWidth);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
    // Intentional: only re-run when `trigger` changes, reading the rest fresh.
  }, [trigger]);

  return (
    <div
      ref={containerRef}
      className="relative h-24 overflow-hidden rounded-2xl border border-surface-line bg-surface-raised"
    >
      <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-bulv shadow-neon-bulv" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 bg-gradient-to-r from-surface-raised to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 bg-gradient-to-l from-surface-raised to-transparent" />
      <div
        className="flex h-full items-center"
        style={{
          transform: `translateX(${offset}px)`,
          transition: animate ? 'transform 3.2s cubic-bezier(0.1,0.65,0.15,1)' : 'none',
        }}
        onTransitionEnd={() => {
          if (animate) {
            setAnimate(false);
            onSettled?.();
          }
        }}
      >
        {reel.map((item, i) => (
          <div
            key={`${item.key}-${i}`}
            className="flex flex-shrink-0 items-center justify-center"
            style={{ width: itemWidth }}
          >
            <span
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{ backgroundColor: `${item.color}22`, border: `1px solid ${item.color}55` }}
            >
              {item.icon}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
