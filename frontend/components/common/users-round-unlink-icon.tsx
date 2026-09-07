"use client";

import { forwardRef, type SVGProps } from "react";

/** Иконка «группа + крестик» из Figma (`assets/svg/users-round-x.svg`). */
export const UsersRoundUnlinkIcon = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement>>(
  function UsersRoundUnlinkIcon({ className, width = 16, height = 16, ...props }, ref) {
    return (
      <svg
        ref={ref}
        width={width}
        height={height}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden
        {...props}
      >
        <path
          d="M11.7002 2.4668C12.1715 2.7463 12.5666 3.13767 12.8505 3.60626C13.1345 4.07485 13.2985 4.60622 13.3282 5.15333C13.3579 5.70044 13.2522 6.24643 13.0206 6.74298C12.7889 7.23952 12.4385 7.67131 12.0002 8.00013C12.4612 8.34591 12.9223 8.82163 13.3282 9.38896"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M11.333 11.333L14.6663 14.6663M14.6663 11.333L11.333 14.6663"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M1.33301 14C1.33301 13.0721 1.57512 12.1602 2.03543 11.3544C2.49573 10.5487 3.1583 9.87699 3.95767 9.40571C4.75704 8.93442 5.66553 8.67986 6.5934 8.66717C7.52126 8.65447 8.43638 8.8841 9.24834 9.33334M9.99967 5.33333C9.99967 7.17428 8.50729 8.66667 6.66634 8.66667C4.82539 8.66667 3.33301 7.17428 3.33301 5.33333C3.33301 3.49238 4.82539 2 6.66634 2C8.50729 2 9.99967 3.49238 9.99967 5.33333Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  },
);
