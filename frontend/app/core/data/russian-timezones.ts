import timezones from "timezones-list"

const RUSSIAN_TZ_NAMES: Record<string, string> = {
	"Europe/Kaliningrad": "Калининград",
	"Europe/Moscow": "Москва",
	"Europe/Kirov": "Киров",
	"Europe/Volgograd": "Волгоград",
	"Europe/Astrakhan": "Астрахань",
	"Europe/Samara": "Самара",
	"Europe/Saratov": "Саратов",
	"Europe/Ulyanovsk": "Ульяновск",
	"Asia/Yekaterinburg": "Екатеринбург",
	"Asia/Omsk": "Омск",
	"Asia/Barnaul": "Барнаул",
	"Asia/Krasnoyarsk": "Красноярск",
	"Asia/Novokuznetsk": "Новокузнецк",
	"Asia/Novosibirsk": "Новосибирск",
	"Asia/Tomsk": "Томск",
	"Asia/Irkutsk": "Иркутск",
	"Asia/Yakutsk": "Якутск",
	"Asia/Vladivostok": "Владивосток",
	"Asia/Magadan": "Магадан",
	"Asia/Sakhalin": "Сахалин",
	"Asia/Srednekolymsk": "Среднеколымск",
	"Asia/Anadyr": "Анадырь",
	"Asia/Kamchatka": "Камчатка",
}

function parseUtcOffset(utc: string): number {
	const match = utc.match(/([+-]?\d{2}):(\d{2})/)
	if (!match) return 0
	const hours = parseInt(match[1], 10)
	const minutes = parseInt(match[2], 10)
	return hours * 60 + (hours < 0 ? -minutes : minutes)
}

export const TIMEZONE_OPTIONS = timezones
	.filter((tz) => tz.tzCode in RUSSIAN_TZ_NAMES)
	.map((tz) => ({
		label: `${RUSSIAN_TZ_NAMES[tz.tzCode]} (UTC${tz.utc})`,
		value: tz.tzCode,
		_offset: parseUtcOffset(tz.utc),
	}))
	.sort((a, b) => a._offset - b._offset)
	.map(({ label, value }) => ({ label, value }))

export function formatTimezoneLabel(tzCode: string | null | undefined): string {
	if (!tzCode) return "Часовой пояс не указан"
	const option = TIMEZONE_OPTIONS.find((o) => o.value === tzCode)
	if (!option) return tzCode
	const city = option.label.split(" (")[0]
	const utcMatch = option.label.match(/UTC([+-]\d{2}):(\d{2})/)
	if (!utcMatch) return option.label
	const sign = utcMatch[1][0]
	const hours = parseInt(utcMatch[1].slice(1), 10)
	const minutes = parseInt(utcMatch[2], 10)
	const offset = minutes === 0 ? `${sign}${hours}` : `${sign}${hours}:${minutes.toString().padStart(2, "0")}`
	return `${city} UTC${offset} (GMT${offset})`
}
