"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTE_LABELS } from "@app/core/configs/routes";
import { useBreadcrumbLabels } from "@app/core/contexts/breadcrumb-labels-context";
import { ChevronRight } from "lucide-react";

export function BreadCrumbs() {
  const pathname = usePathname();
  const { labels: dynamicLabels } = useBreadcrumbLabels();
  const segments = pathname.split("/").filter(Boolean);

  const crumbs: { path: string; label: string }[] = [];
  for (let i = 0; i < segments.length; i++) {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const label = dynamicLabels[path] ?? ROUTE_LABELS[path];
    if (label) {
      crumbs.push({ path, label });
    }
  }

  if (crumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-breadcrumb text-text-secondary">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <span key={crumb.path} className="flex items-center gap-2 text-secondary">
            {index > 0 && <ChevronRight className="h-4 w-4 text-icon-secondary" />}
            {isLast ? (
              <span className="text-text-tertiary">{crumb.label}</span>
            ) : (
              <Link href={crumb.path} className="hover:text-text-link transition-colors">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
