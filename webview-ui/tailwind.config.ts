import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        board: "0 24px 80px rgba(0, 0, 0, 0.45)"
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "serif"],
        ui: ["Segoe UI", "Tahoma", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config;
