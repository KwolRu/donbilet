"use client";

import { useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  content: string;
  children: ReactNode;
  contentClassName?: string;
  wrapperClassName?: string;
  side?: "top" | "right";
};

function subscribeMounted() {
  return () => {};
}

function getClientMountedSnapshot() {
  return true;
}

function getServerMountedSnapshot() {
  return false;
}

function getVisibleContentCenter(anchor: HTMLElement, side: Props["side"] = "top") {
  const rect = anchor.getBoundingClientRect();
  if (side === "right") {
    return {
      left: rect.right + 8,
      top: rect.top + rect.height / 2,
    };
  }

  return {
    left: rect.left + rect.width / 2,
    top: rect.top - 8,
  };
}

export function HoverTooltip({
  content,
  children,
  contentClassName = "",
  wrapperClassName = "",
  side = "top",
}: Props) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const mounted = useSyncExternalStore(
    subscribeMounted,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const updatePosition = () => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    setPosition(getVisibleContentCenter(anchor, side));
  };

  return (
    <>
      <div
        ref={anchorRef}
        className={`relative inline-flex ${wrapperClassName}`}
        onMouseEnter={() => {
          updatePosition();
          setVisible(true);
        }}
        onMouseMove={updatePosition}
        onMouseLeave={() => setVisible(false)}
      >
        {children}
      </div>
      {mounted
        ? createPortal(
            <div
              className={`pointer-events-none fixed z-9999 transition-opacity duration-150 ${
                visible ? "opacity-100" : "opacity-0"
              } ${side === "right" ? "-translate-y-1/2" : "-translate-x-1/2 -translate-y-full"}`}
              style={{ left: position.left, top: position.top }}
            >
              <div
                className={`w-fit max-w-[360px] rounded-[8px] bg-bg-surface-base-primary p-1 text-text-inverse text-caption-sm whitespace-normal wrap-break-word ${contentClassName}`}
                style={{ cornerShape: "squircle" } as CSSProperties}
              >
                {content}
              </div>
              {side === "right" ? (
                <div className="absolute top-1/2 -left-2 h-0 w-0 -translate-y-1/2 border-y-8 border-r-8 border-y-transparent border-r-bg-surface-base-primary" />
              ) : (
                <div className="absolute left-1/2 -bottom-2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-bg-surface-base-primary" />
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
