export const SEASONS = ["Spring", "Summer", "Fall", "Winter", "F/W", "S/S"];

export const PLACEHOLDER_TONES: Array<[string, string]> = [
  ["#E8DDD0", "#C9B8A4"],
  ["#D9CFC0", "#A8957E"],
  ["#EADFD0", "#D4B896"],
  ["#C5B5A0", "#8E7A63"],
  ["#E5D9C8", "#B09A7F"],
  ["#D1C2AE", "#9A8569"],
  ["#F0E6D6", "#CBB99F"],
  ["#BCA890", "#7D6B54"],
  ["#DFD2BE", "#B59E82"],
  ["#C9BBA3", "#8A7860"],
  ["#E2D3BD", "#A88B6A"],
  ["#B8A488", "#73604A"]
];

export const THEME_OPTIONS = [
  { value: "safe", label: "Clay" },
  { value: "bold", label: "Brick" },
  { value: "sage", label: "Sage" }
] as const;

export type ThemeName = (typeof THEME_OPTIONS)[number]["value"];

export const DEFAULT_THEME: ThemeName = "bold";
