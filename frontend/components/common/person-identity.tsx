"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { HighlightMatch } from "@/components/common/highlight-match";

type Props = {
  name: string;
  subtitle?: string;
  avatarUrl?: string | null;
  searchQuery?: string;
  /** Переход на карточку (приоритетнее onClick). */
  href?: string;
  onClick?: () => void;
  size?: "xs" | "sm" | "md";
  className?: string;
};

export function PersonIdentity({
  name,
  subtitle,
  avatarUrl,
  searchQuery,
  href,
  onClick,
  size = "sm",
  className = "",
}: Props) {
  const avatarSizeClass =
    size === "md" ? "size-10" : size === "xs" ? "size-6" : "size-8";
  const iconSizeClass = size === "md" ? "size-5" : size === "xs" ? "size-3" : "size-4";
  const rowAlignClass = size === "xs" || !subtitle ? "items-center" : "items-start";
  const nameClass =
    size === "xs"
      ? "text-body-regular text-text-primary group-hover:text-text-link-hover transition-colors"
      : "text-body-medium text-text-primary group-hover:text-text-link-hover transition-colors";
  const innerClass = `group cursor-pointer flex ${rowAlignClass} gap-2 ${onClick || href ? "text-left" : ""} ${className}`;

  const body = (
    <>
      <div
        className={`${avatarSizeClass} rounded-full bg-bg-surface-base-layout text-text-primary flex items-center justify-center shrink-0 overflow-hidden`}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <UserRound className={`${iconSizeClass} text-icon-primary`} />
        )}
      </div>
      <div className={`flex flex-col ${size === "xs" ? "" : "gap-1"}`}>
        <HighlightMatch text={name} query={searchQuery} className={nameClass} />
        {subtitle && size !== "xs" ? (
          <span className="text-body-regular text-text-secondary">{subtitle}</span>
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={innerClass}>
        {body}
      </Link>
    );
  }

  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      {...(onClick ? { type: "button", onClick } : {})}
      className={innerClass}
    >
      {body}
    </Wrapper>
  );
}
