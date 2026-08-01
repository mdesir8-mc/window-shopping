import { useWindowDimensions } from "react-native";

// Native replacement for the web matchMedia hook. Ported components call useMediaQuery /
// useIsMobile; on native we derive the answer from the live window width instead.
export function useMediaQuery(query: string) {
  const { width } = useWindowDimensions();

  const max = /max-width:\s*(\d+)/.exec(query);
  if (max) {
    return width <= Number(max[1]);
  }

  const min = /min-width:\s*(\d+)/.exec(query);
  if (min) {
    return width >= Number(min[1]);
  }

  return false;
}

export function useIsMobile() {
  const { width } = useWindowDimensions();
  return width <= 820;
}
