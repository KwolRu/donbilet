import appStoreIcon from "@assets/svg/social/store-apple.svg";
import appGalleryIcon from "@assets/svg/social/store-appgallery.svg";
import googlePlayIcon from "@assets/svg/social/store-google-play.svg";

/**
 * Иконки магазинов приложений в футере: AppGallery, Google Play, App Store.
 *
 * Глифы выгружены из Figma уже белыми и без плитки: плашку #525252 рисует
 * футер (`TILE`), одну на все три. Раньше здесь лежали фирменные цветные
 * ассеты, которые приходилось перекрашивать через `brightness-0 invert`, а
 * AppGallery — и вовсе перерисовывать инлайном, потому что глиф шёл на
 * красном фоне.
 *
 * Ссылки — заглушки: страницы приложений появятся к публикации (Ф10).
 */
export const STORE_ICONS = [
  { label: "AppGallery", href: "#", src: appGalleryIcon },
  { label: "Google Play", href: "#", src: googlePlayIcon },
  { label: "App Store", href: "#", src: appStoreIcon },
] as const;
