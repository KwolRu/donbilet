import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)", "sans-serif"],
        Inter: ["var(--font-inter)", "sans-serif"],
      },
      colors: {
        text: {
          link: "#5e46fb",
          secondary: "#666666",
          error: "var(--text-error, #e6282d)",
        },
        bg: {
          primary: "#ffffff",
          secondary: "#f5f5f5",
          "border-subtle": "#eeeef0",
        },
        border: {
          default: "var(--border-default, #cecdd4)",
          subtle: "var(--border-subtle, #eeeef0)",
          hover: "var(--border-hover, #480fdb)",
        },
        "bg-label-strong_10": "var(--color-bg-label-strong_10, #ff5900)",
        outline: {
          "border-subtle": "var(--border-subtle, #eeeef0)",
          "Icon-primary": "var(--color-primary, #5e46fb)",
          "Icon-secondary": "var(--color-icon-secondary, #595669)",
          "Icon-accent": "var(--color-Icon-accent, #3a2590)",
          "Icon-button-ghost-normal": "var(--color-icon-button-ghost-normal, #595669)",
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
