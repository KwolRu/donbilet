import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
        Inter: ["var(--font-inter)", "sans-serif"],
      },
      // Значения после запятой — фолбэки, если CSS-переменная не объявлена.
      // Держим их в палитре ДонБилет, иначе при сбое загрузки global.css
      // проступает фиолетовый шаблона.
      colors: {
        text: {
          link: "#191919",
          secondary: "#525252",
          error: "var(--text-error, #e6282d)",
        },
        bg: {
          primary: "#ffffff",
          secondary: "#f6f6f6",
          "border-subtle": "#f6f6f6",
        },
        border: {
          default: "var(--border-default, #d9d9d9)",
          subtle: "var(--border-subtle, #f6f6f6)",
          hover: "var(--border-hover, #191919)",
        },
        "bg-label-strong_10": "var(--color-bg-label-strong_10, #ff5900)",
        outline: {
          "border-subtle": "var(--border-subtle, #f6f6f6)",
          "Icon-primary": "var(--color-primary, #ffc700)",
          "Icon-secondary": "var(--color-icon-secondary, #525252)",
          "Icon-accent": "var(--color-Icon-accent, #a67f00)",
          "Icon-button-ghost-normal": "var(--color-icon-button-ghost-normal, #525252)",
        },
      },
      fontSize: {
        "6xl": "3.75rem",
      },
      lineHeight: {
        "[61.60px]": "61.60px",
      },
    },
  },
  plugins: [],
};

export default config;
