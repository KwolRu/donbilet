import type { ReactNode } from "react";

type EmptyBlockProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export function EmptyBlock({
  title,
  description,
  icon,
  className = "",
  children,
}: EmptyBlockProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 text-center p-6 ${className}`}
    >
      {icon && (
        <div className="flex items-center justify-center text-text-tertiary">
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-1 max-w-[408px]">
        {title && (
          <h3 className="text-text-primary text-xl font-medium font-['Inter'] leading-6">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-text-secondary text-base font-normal font-['Inter'] leading-5">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
