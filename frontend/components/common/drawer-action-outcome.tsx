"use client";

import Image from "next/image";
import drawerError from "@/assets/images/common/drawer-error.png";
import drawerSuccess from "@/assets/images/common/drawer-success.png";

type Variant = "success" | "error";

type Props = {
  variant: Variant;
  className?: string;
};

export function DrawerActionOutcome({ variant, className = "" }: Props) {
  const src = variant === "success" ? drawerSuccess : drawerError;
  return (
    <div className={`relative w-full shrink-0 overflow-hidden rounded-xl ${className}`}>
      <div className="relative aspect-square w-full">
        <Image src={src} alt="" fill className="object-contain" sizes="(max-width: 474px) 100vw, 422px" />
      </div>
    </div>
  );
}
