"use client"

import { useMemo, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface UserAvatarProps {
  name?: string
  avatarUrl?: string | null
  size?: number
  className?: string
}

const AVATAR_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEAA7", // Yellow
  "#DDA15E", // Orange
  "#BC6C25", // Brown
  "#8B5A8E", // Purple
  "#D4A5A5", // Mauve
  "#6C5B7B", // Lavender
  "#355C7D", // Navy
  "#2A9D8F", // Seafoam
]

function getInitial(name?: string): string {
  if (!name) return "?"
  return name.charAt(0).toUpperCase()
}

function getColorForName(name?: string): string {
  if (!name) return AVATAR_COLORS[0]
  
  // Генерируем индекс цвета на основе имени (детерминированно)
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length
  return AVATAR_COLORS[colorIndex]
}

export function UserAvatar({ name, avatarUrl, size = 40, className = "" }: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const initial = useMemo(() => getInitial(name), [name])
  const backgroundColor = useMemo(() => getColorForName(name), [name])

  const trimmedAvatar = avatarUrl?.trim() || null

  if (trimmedAvatar && !imageError) {
    return (
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {!imageLoaded && (
          <Skeleton
            width={size}
            height={size}
            rounded="full"
            className="absolute inset-0"
          />
        )}
        <img
          src={trimmedAvatar}
          alt={name || "avatar"}
          width={size}
          height={size}
          className={`rounded-full object-cover ${className}`}
          style={{ width: size, height: size }}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor,
        fontSize: `${size * 0.4}px`,
      }}
    >
      {initial}
    </div>
  )
}
