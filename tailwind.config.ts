import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        cloud: "#f6f7f2",
        mint: "#d9efe6",
        coral: "#ef7d65",
        ocean: "#2f6f8f",
        graphite: "#3d4652",
      },
      boxShadow: {
        panel: "0 18px 60px rgba(31, 41, 51, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
