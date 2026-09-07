import type { CSSProperties, ReactNode } from "react";

type PageSurfaceProps = {
  children: ReactNode;
  className?: string;
};

export function PageSurface({ children, className }: PageSurfaceProps) {
  return (
    <section
      className={`h-full min-h-0 w-full min-w-0 max-w-full flex-1 overflow-hidden rounded-[48px] bg-bg-surface-base-default p-6 ${className ?? ""}`}
      style={{ cornerShape: "squircle" } as CSSProperties}
    >
      {children}
    </section>
  );
}
