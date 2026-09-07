export type SelectMenuPlacement = "auto" | "bottom"

type SelectMenuLayoutInput = {
  triggerTop: number
  triggerBottom: number
  viewportHeight: number
  placement: SelectMenuPlacement
}

type SelectMenuLayout = {
  openUpwards: boolean
  maxHeight: number
  top: number | null
  bottom: number | null
}

const MENU_GAP = 8
const VIEWPORT_PADDING = 16
const AUTO_FLIP_THRESHOLD = 220
const MIN_MENU_HEIGHT = 96
const MAX_MENU_HEIGHT = 322

export function getSelectMenuLayout({
  triggerTop,
  triggerBottom,
  viewportHeight,
  placement,
}: SelectMenuLayoutInput): SelectMenuLayout {
  const spaceBelow = Math.max(0, viewportHeight - triggerBottom - VIEWPORT_PADDING)
  const spaceAbove = Math.max(0, triggerTop - VIEWPORT_PADDING)
  const openUpwards =
    placement === "auto" &&
    spaceBelow < AUTO_FLIP_THRESHOLD &&
    spaceAbove > spaceBelow
  const availableHeight = openUpwards ? spaceAbove : spaceBelow
  const maxHeight = Math.max(
    MIN_MENU_HEIGHT,
    Math.min(MAX_MENU_HEIGHT, availableHeight),
  )

  if (openUpwards) {
    return {
      openUpwards,
      maxHeight,
      top: null,
      bottom: viewportHeight - triggerTop + MENU_GAP,
    }
  }

  return {
    openUpwards,
    maxHeight,
    top: triggerBottom + MENU_GAP,
    bottom: null,
  }
}
