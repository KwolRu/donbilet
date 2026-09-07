import type { ReactNode } from "react";
import { PageSurface } from "./page-surface";

type Props = {
  sidebar: ReactNode;
  sidebarFooter?: ReactNode;
  chrome: ReactNode;
  content: ReactNode;
};

export function ProfilePageLayout({ sidebar, sidebarFooter, chrome, content }: Props) {
  return (
    <PageSurface className="flex flex-col gap-4 overflow-hidden">
      <div className="flex min-h-0 flex-1 gap-8 overflow-hidden">
        <aside className="flex h-full min-h-0 w-[424px] shrink-0 flex-col overflow-hidden border-r border-border-subtle pr-6">
          <div className="custom-scrollbar-overlay flex min-h-0 flex-1 flex-col gap-4">
            {sidebar}
          </div>
          {sidebarFooter ? <div className="shrink-0 pt-4">{sidebarFooter}</div> : null}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-8 overflow-hidden">
          {chrome}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{content}</div>
        </div>
      </div>
    </PageSurface>
  );
}
