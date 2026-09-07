"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const CHIP_GAP = 8;
const MAX_LINES = 2;

type Props<T> = {
  items: T[];
  className?: string;
  renderItem: (item: T) => ReactNode;
  renderOverflow: (hiddenCount: number, hiddenItems: T[]) => ReactNode;
  getItemKey: (item: T) => string;
};

function measureOverflowWidth(hiddenCount: number) {
  const probe = document.createElement("span");
  probe.className =
    "inline-flex rounded-[8px] bg-bg-surface-base-layout px-2 py-1 text-body-regular whitespace-nowrap";
  probe.textContent = `+${hiddenCount}`;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const width = probe.offsetWidth;
  document.body.removeChild(probe);
  return width;
}

function packWithOverflow(chipWidths: number[], overflowWidth: number, containerWidth: number) {
  let line = 1;
  let used = 0;

  const place = (width: number) => {
    const nextUsed = used === 0 ? width : used + CHIP_GAP + width;
    if (nextUsed > containerWidth) {
      line += 1;
      used = width;
    } else {
      used = nextUsed;
    }
    return line <= MAX_LINES;
  };

  for (const chipWidth of chipWidths) {
    if (!place(chipWidth)) return false;
  }
  return place(overflowWidth);
}

function fitsInLines(chipWidths: number[], containerWidth: number, reserveWidth = 0) {
  let line = 1;
  let used = 0;

  for (let index = 0; index < chipWidths.length; index += 1) {
    const chipWidth = chipWidths[index];
    const nextUsed = used === 0 ? chipWidth : used + CHIP_GAP + chipWidth;

    if (nextUsed > containerWidth) {
      line += 1;
      used = chipWidth;
    } else {
      used = nextUsed;
    }

    if (line > MAX_LINES) return index;
  }

  if (reserveWidth === 0) return chipWidths.length;

  const total = chipWidths.length;
  let visible = total;
  while (visible > 0) {
    const widths = chipWidths.slice(0, visible);
    const overflowWidth = measureOverflowWidth(total - visible);
    if (packWithOverflow(widths, overflowWidth, containerWidth)) return visible;
    visible -= 1;
  }
  return 0;
}

export function TwoLineOverflowChips<T>({
  items,
  className = "",
  renderItem,
  renderOverflow,
  getItemKey,
}: Props<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(items.length);
  const [measureWidth, setMeasureWidth] = useState(0);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => setMeasureWidth(container.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const measure = measureRef.current;
    if (!measure || measureWidth <= 0 || items.length === 0) {
      setVisibleCount(items.length);
      return;
    }

    const chipElements = Array.from(measure.children) as HTMLElement[];
    const chipWidths = chipElements.map((element) => element.offsetWidth);
    const maxWithoutOverflow = fitsInLines(chipWidths, measureWidth, 0);

    if (maxWithoutOverflow >= items.length) {
      setVisibleCount(items.length);
      return;
    }

    setVisibleCount(fitsInLines(chipWidths, measureWidth, measureOverflowWidth(1)));
  }, [items, measureWidth]);

  const hiddenCount = Math.max(0, items.length - visibleCount);

  return (
    <div className="relative">
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 -z-10 flex flex-wrap gap-2 opacity-0"
        style={{ width: measureWidth || undefined }}
      >
        {items.map((item) => (
          <span key={getItemKey(item)}>{renderItem(item)}</span>
        ))}
      </div>

      <div ref={containerRef} className={`flex max-h-[64px] flex-wrap gap-2 overflow-hidden ${className}`}>
        {items.slice(0, visibleCount).map((item) => (
          <span key={getItemKey(item)}>{renderItem(item)}</span>
        ))}
        {hiddenCount > 0 ? renderOverflow(hiddenCount, items.slice(visibleCount)) : null}
      </div>
    </div>
  );
}
