import Image from "next/image";

export function QrCode({ className }: { className?: string }) {
  return (
    <Image
      src="/images/app-promo/qr-code.png"
      alt="QR-код приложения"
      width={720}
      height={720}
      className={className}
    />
  );
}
