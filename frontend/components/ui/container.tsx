import { PropsWithChildren } from "react";

type ContainerProps = PropsWithChildren<{
  className?: string;
}>;

export function Container({ children, className = "" }: ContainerProps) {
  return (
    <div
      className={[
        "w-full mx-auto",
        "tablet:w-[768px] tablet:max-w-[768px]",
        "laptop:w-[1024px] laptop:max-w-[1024px]",
        "desktop:w-[1440px] desktop:max-w-[1440px]",
        "desktopL:w-[1920px] desktopL:max-w-[1920px]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
