"use client"

import { useEffect, useState } from "react"

type ErrorBannerProps = {
  title?: string
  message?: string | null
  autoDismissMs?: number
  onDismiss?: () => void
}

export function ErrorBanner({
  message,
  autoDismissMs = 10000,
  onDismiss,
}: ErrorBannerProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      onDismiss?.()
    }, autoDismissMs)
    return () => {
      clearTimeout(timer)
      setVisible(true)
    }
  }, [message, autoDismissMs, onDismiss])

  if (!message || !visible) return null

  const handleClick = () => {
    setVisible(false)
    onDismiss?.()
  }

  return (
    <div
      onClick={handleClick}
      className="self-stretch p-3 rounded-xl inline-flex flex-col justify-center items-start gap-1 cursor-pointer bg-[#fff1f1] w-full"
    >
      {/* <div className="self-stretch justify-center text-error text-base font-medium font-['Inter'] leading-5">
        {title}
      </div> */}
      <div className="self-stretch justify-center text-error text-sm font-normal font-['Inter'] leading-4">
        {message}
      </div>
    </div>
  )
}
