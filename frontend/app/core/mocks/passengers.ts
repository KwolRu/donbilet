import type { StaticImageData } from "next/image";

import avatarDemo from "@assets/images/account/avatar-demo.png";
import passengerCover from "@assets/images/account/profile-cover.png";

/**
 * Мок-данные раздела «Пассажиры».
 *
 * Форма записи повторяет ожидаемый ответ API (`GET /api/passengers`): при
 * подключении стенда (блокер B1) меняется только источник.
 *
 * Аватар и обложка у всех одни и те же: в макете это фотографии из библиотеки,
 * а в продукте они придут с бэкенда вместе с пассажиром. Заводить десять
 * файлов ради витрины смысла нет.
 */

export type Gender = "male" | "female";

/** Типы документов из макета. Значения — будущие коды API. */
export const DOCUMENT_TYPES = [
  { value: "passport_rf", label: "Паспорт РФ" },
  { value: "passport_international", label: "Загранпаспорт РФ" },
  { value: "foreign_document", label: "Иностранный документ" },
  { value: "birth_certificate", label: "Свидетельство о рождении" },
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number]["value"];

export type PassengerDocument = {
  type: DocumentType;
  /** «5006 236703» — как вводит пользователь, без нормализации. */
  number: string;
};

export type Passenger = {
  id: number;
  lastName: string;
  firstName: string;
  /** Пустая строка — отчества нет; в форме это отдельная галочка. */
  middleName: string;
  gender: Gender;
  /** ISO-дата: строка, а не `Date` — так придёт с бэкенда и так же уйдёт в URL. */
  birthDate: string;
  citizenship: string;
  documents: PassengerDocument[];
  avatar: StaticImageData;
  cover: StaticImageData;
};

/** Сколько пассажиров разрешено хранить в аккаунте (правило из макета). */
export const PASSENGERS_LIMIT = 10;

type PassengerSeed = Omit<Passenger, "id" | "avatar" | "cover">;

const SEEDS: PassengerSeed[] = [
  {
    lastName: "Чернышёв",
    firstName: "Михаил",
    middleName: "Николаевич",
    gender: "male",
    birthDate: "2002-03-22",
    citizenship: "RU",
    documents: [
      { type: "passport_rf", number: "5006 236703" },
      { type: "passport_international", number: "75 1234567" },
      { type: "foreign_document", number: "IDN-4471" },
    ],
  },
  {
    lastName: "Полетаева",
    firstName: "Ксения",
    middleName: "Ивановна",
    gender: "female",
    birthDate: "1997-09-10",
    citizenship: "RU",
    documents: [
      { type: "passport_rf", number: "6012 447120" },
      { type: "passport_international", number: "76 9087612" },
      { type: "foreign_document", number: "IDN-2210" },
    ],
  },
  {
    lastName: "Филатов",
    firstName: "Олег",
    middleName: "Викторович",
    gender: "male",
    birthDate: "1993-10-10",
    citizenship: "RU",
    documents: [
      { type: "passport_rf", number: "6003 118842" },
      { type: "passport_international", number: "72 3345901" },
    ],
  },
  {
    lastName: "Сагинова",
    firstName: "Дарья",
    middleName: "Владимировна",
    gender: "female",
    birthDate: "1986-02-01",
    citizenship: "RU",
    documents: [
      { type: "passport_rf", number: "6104 552013" },
      { type: "foreign_document", number: "IDN-9931" },
    ],
  },
  {
    lastName: "Югина",
    firstName: "Наталья",
    middleName: "Дмитриевна",
    gender: "female",
    birthDate: "2006-11-08",
    citizenship: "RU",
    documents: [
      { type: "passport_rf", number: "6019 771264" },
      { type: "birth_certificate", number: "IV-АН 552019" },
    ],
  },
  {
    lastName: "Ростовцев",
    firstName: "Артём",
    middleName: "Михайлович",
    gender: "male",
    birthDate: "1996-04-02",
    citizenship: "RU",
    documents: [{ type: "passport_rf", number: "6008 330214" }],
  },
  {
    lastName: "Мартынова",
    firstName: "Елена",
    middleName: "Николаевна",
    gender: "female",
    birthDate: "2000-12-21",
    citizenship: "RU",
    documents: [
      { type: "passport_rf", number: "6015 908134" },
      { type: "passport_international", number: "71 4409821" },
    ],
  },
  {
    lastName: "Зырянова",
    firstName: "Юлия",
    middleName: "Петровна",
    gender: "female",
    birthDate: "2002-01-29",
    citizenship: "RU",
    documents: [{ type: "passport_rf", number: "6021 664398" }],
  },
];

export const MOCK_PASSENGERS: Passenger[] = SEEDS.map((seed, index) => ({
  ...seed,
  id: index + 1,
  avatar: avatarDemo,
  cover: passengerCover,
}));

/**
 * Страны для поля «Гражданство».
 *
 * Список сокращён до узнаваемого набора: полный справочник придёт с бэкенда,
 * а держать здесь две сотни строк ради витрины незачем. Россия первой — так в
 * макете, это самый частый выбор.
 */
export const CITIZENSHIP_OPTIONS = [
  { value: "RU", label: "Россия" },
  { value: "AM", label: "Армения" },
  { value: "BY", label: "Беларусь" },
  { value: "DE", label: "Германия" },
  { value: "GE", label: "Грузия" },
  { value: "IL", label: "Израиль" },
  { value: "KZ", label: "Казахстан" },
  { value: "KG", label: "Киргизия" },
  { value: "CN", label: "Китай" },
  { value: "PE", label: "Перу" },
  { value: "PL", label: "Польша" },
  { value: "PT", label: "Португалия" },
  { value: "RW", label: "Руанда" },
  { value: "RO", label: "Румыния" },
  { value: "SV", label: "Сальвадор" },
  { value: "RS", label: "Сербия" },
  { value: "TR", label: "Турция" },
  { value: "UZ", label: "Узбекистан" },
] as const;

export const GENDER_OPTIONS = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
] as const;

/** «Чернышёв М.Н.» — подпись на карточке. */
export function shortName({ lastName, firstName, middleName }: Passenger): string {
  const initials = [firstName, middleName]
    .filter(Boolean)
    .map((part) => `${part[0]}.`)
    .join("");

  return initials ? `${lastName} ${initials}` : lastName;
}

/** «Чернышёв Михаил Николаевич» — заголовок панели. */
export function fullName({ lastName, firstName, middleName }: Passenger): string {
  return [lastName, firstName, middleName].filter(Boolean).join(" ");
}

/** ISO → «22.03.2002». */
export function formatBirthDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

export function documentLabel(type: DocumentType): string {
  return DOCUMENT_TYPES.find((item) => item.value === type)?.label ?? type;
}

export function citizenshipLabel(code: string): string {
  return CITIZENSHIP_OPTIONS.find((item) => item.value === code)?.label ?? code;
}
