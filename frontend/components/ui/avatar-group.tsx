"use client"

import { UserRound } from "lucide-react"

export interface AvatarParticipant {
  id: string
  name: string
  avatarUrl?: string | null
}

interface AvatarGroupProps {
  participants: AvatarParticipant[]
  maxVisible?: number
  size?: number
  className?: string
}

export function AvatarGroup({
  participants,
  maxVisible = 4,
  size = 20,
  className = "",
}: AvatarGroupProps) {
  if (participants.length === 0) return null

  const visible = participants.slice(0, maxVisible)
  const restCount = participants.length - visible.length

  const overlapClass = "-ml-1.5"

  return (
    <div className={`flex shrink-0 items-center ${className}`}>
      {visible.map((p, i) => (
        <div
          key={p.id}
          className={[
            "rounded-full border border-white bg-bg-surface-base-layout flex items-center justify-center overflow-hidden",
            size === 20 ? "h-5 w-5" : "",
            i > 0 ? overlapClass : "",
          ].join(" ")}
          style={size !== 20 ? { width: size, height: size } : undefined}
        >
          {p.avatarUrl ? (
            <img
              src={p.avatarUrl}
              alt={p.name}
              width={size}
              height={size}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="h-[60%] w-[60%] text-icon-primary" />
          )}
        </div>
      ))}

      {restCount > 0 && (
        <div
          className={[
            "flex items-center justify-center rounded-full border border-white bg-[var(--bg-surface-base-tertiary,#f5f5f9)]",
            overlapClass,
            size === 20 ? "h-5 w-5" : "",
          ].join(" ")}
          style={size !== 20 ? { width: size, height: size } : undefined}
        >
          <span className="text-[8px] leading-[8px] text-text-primary">+{restCount}</span>
        </div>
      )}
    </div>
  )
}
