"use client"

import { useCallback, useMemo } from "react"
import { HexColorInput, RgbaColorPicker } from "react-colorful"

import { colorToRgba, hexToRgba, rgbaToCssColor, rgbaToHex } from "@app/core/utils/color"

type ColorPickerPopoverProps = {
	color: string
	onChange: (color: string) => void
}

export function ColorPickerPopover({ color, onChange }: ColorPickerPopoverProps) {
	const rgba = useMemo(() => colorToRgba(color), [color])
	const hexColor = useMemo(() => rgbaToHex(rgba), [rgba])

	const handleHexChange = useCallback(
		(nextHex: string) => {
			onChange(rgbaToCssColor({ ...hexToRgba(nextHex), a: rgba.a }))
		},
		[onChange, rgba.a]
	)

	const handleRgbaChange = useCallback(
		(nextColor: { r: number; g: number; b: number; a: number }) => {
			onChange(rgbaToCssColor(nextColor))
		},
		[onChange]
	)

	return (
		// Внешний контейнер popup: позиция, ширина, скругление, внутренние отступы, тень.
		<div className="absolute right-0 top-full z-50 mt-2 w-[200px] rounded-xl bg-bg-surface-base-default p-3 shadow-[0px_4px_16px_0px_rgba(0,0,0,0.08)]">
			<div className="flex flex-col gap-2">
				{/* Блок с HEX-инпутом и превью текущего цвета */}
				<div className="rounded-[24px] border border-border-subtle bg-white p-3 shadow-[0px_1px_2px_0px_rgba(16,24,40,0.05)]"
					style={{ cornerShape: "squircle" } as React.CSSProperties}

				>
					<div className="flex items-center gap-2">
						<div className="flex-1">
							<HexColorInput
								color={hexColor}
								onChange={handleHexChange}
								prefixed
								className="w-full bg-transparent text-base font-normal leading-6 text-[#191919] outline-none"

							/>
						</div>

						<div
							// Размер круглого предпросмотра справа от инпута
							className="h-6 w-6 shrink-0 rounded-full"
							style={{ backgroundColor: color }}
						/>
					</div>
				</div>

				{/* Сам color picker: круг + hue/alpha слайдеры */}
				<div className="figma-rgba-picker w-full">
					<RgbaColorPicker
						color={rgba}
						onChange={handleRgbaChange}
					/>
				</div>
			</div>

			<style jsx global>{`
        /* Корневой контейнер react-colorful внутри popup */
        .figma-rgba-picker .react-colorful {
          width: 100%;
					height: auto;
          background: transparent;
        }

        /* Круг выбора цвета (saturation area): размер и форма */
        .figma-rgba-picker .react-colorful__saturation {
          width: 176px;
          height: 176px;

          aspect-ratio: 1 / 1;
          border-bottom: none;
          border-radius: 50%;
          overflow: hidden;
        }

        /* Ползунки hue и alpha: здесь меняется их высота */
        .figma-rgba-picker .react-colorful__hue,
        .figma-rgba-picker .react-colorful__alpha {
          width: 100%;
          height: 12px;
          border-radius: 9999px;
        }

        /* Отступ между кругом и hue */
        .figma-rgba-picker .react-colorful__hue {
          margin-top: 8px;
        }

        /* Отступ между hue и alpha */
        .figma-rgba-picker .react-colorful__alpha {
          margin-top: 8px;
        }

        /* Размер маркера-указателя на круге/ползунках */
        .figma-rgba-picker .react-colorful__pointer {
          width: 12px;
          height: 12px;
        }

        /* Обводка внутренней части маркера */
        .figma-rgba-picker .react-colorful__pointer-fill {
          border: 1px solid #fff;
        }
      `}</style>
		</div>
	)
}
