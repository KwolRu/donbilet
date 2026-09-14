import Image from "next/image";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="ДонБилет"
      width={1995}
      height={555}
      priority
      className={`h-8 sm:h-10 w-auto ${className ?? ""}`}
    />
  );
}
