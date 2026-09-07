"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function DottedLinkText({ children, onClick, className = "" }: Props) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`cursor-pointer inline-block truncate border-b border-dotted border-border-default text-body-medium text-text-primary hover:text-text-link-hover transition-colors ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <span
      className={`cursor-pointer inline-block truncate border-b border-dotted border-border-default text-body-medium text-text-primary hover:text-text-link-hover transition-colors ${className}`}
    >
      {children}
    </span>
  );
}
