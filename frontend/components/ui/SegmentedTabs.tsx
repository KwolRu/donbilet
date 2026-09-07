import * as React from "react"

type TabItem<T extends string> = {
	value: T
	label: string
}

type SegmentedTabsProps<T extends string> = {
	tabs: readonly TabItem<T>[]
	value: T
	onChange: (value: T) => void
	containerClassName?: string
	buttonClassName?: string
	activeButtonClassName?: string
	inactiveButtonClassName?: string
	optimistic?: boolean
}

export function SegmentedTabs<T extends string>({
	tabs,
	value,
	onChange,
	containerClassName,
	buttonClassName = "",
	activeButtonClassName = "",
	inactiveButtonClassName = "",
	optimistic = true,
}: SegmentedTabsProps<T>) {
	const [pending, setPending] = React.useState<T | null>(null)

	// Оптимистичное значение живёт ровно до момента, когда родитель подтвердил
	// смену через props. Сбрасываем во время рендера, а не в эффекте: лишний
	// проход рендера здесь виден как мигание активной вкладки.
	if (optimistic && pending !== null && pending === value) {
		setPending(null)
	}

	const active = optimistic ? (pending ?? value) : value

	const handleClick = (tabValue: T) => {
		if (optimistic) {
			setPending(tabValue)
		}
		React.startTransition(() => {
			onChange(tabValue)
		})
	}

	return (
		<div
			className={[
				"inline-flex w-full rounded-[24px] border border-border-subtle p-1",
				containerClassName ?? "",
			].join(" ")}
			style={{ cornerShape: "squircle" } as React.CSSProperties}
		>
			{tabs.map((tab) => {
				const isActive = active === tab.value

				return (
					<button
						key={tab.value}
						type="button"
						onClick={() => handleClick(tab.value)}
						className={[
							"flex flex-1 items-center justify-center rounded-[16px] text-sm font-normal transition-[background-color,color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
							buttonClassName,
							isActive ? activeButtonClassName : inactiveButtonClassName,
						].join(" ")}
						style={{ cornerShape: "squircle" } as React.CSSProperties}
					>
						{tab.label}
					</button>
				)
			})}
		</div>
	)
}
