import { useEffect, type CSSProperties } from "react";
import { designOf } from "../../export/bookDesign.js";
import { looksCss } from "../../export/styleLooks.js";
import { bookTheme, isDarkTheme, themeTokens, type Theme } from "../../project/themes.js";

/** The book's theme as style on the app's outermost element; nothing when it follows the app. */
export function themeStyle(fields: Record<string, unknown>): CSSProperties | undefined {
  const theme = bookTheme(fields);
  if (!theme) return undefined;
  return {
    ...themeTokens(theme),
    colorScheme: isDarkTheme(theme) ? "dark" : "light",
  } as CSSProperties;
}

// Each style's typeface and size, in the text and wherever a style shows itself by name.
function useStyleLooks(fields: Record<string, unknown>) {
  const css = looksCss(
    designOf(fields).looks,
    (name) => `.manuscript .style-${name}, .look-${name}`,
  );
  useEffect(() => {
    const style = document.head.appendChild(document.createElement("style"));
    style.textContent = css;
    return () => style.remove();
  }, [css]);
}

/** The book's theme and styles on the whole page, so dialogs drawn outside the app get them too. */
export function useBookTheme(fields: Record<string, unknown>) {
  useStyleLooks(fields);
  const style = themeStyle(fields) as Record<string, string> | undefined;
  const key = JSON.stringify(style ?? null);
  useEffect(() => {
    const root = document.documentElement.style;
    const tokens = Object.entries(style ?? {}).filter(([name]) => name.startsWith("--"));
    tokens.forEach(([name, value]) => root.setProperty(name, value));
    root.colorScheme = style?.["colorScheme"] ?? "";
    return () => {
      tokens.forEach(([name]) => root.removeProperty(name));
      root.colorScheme = "";
    };
    // The key holds the style's values, so a new object with the same theme changes nothing.
  }, [key]);
}

/** A ready theme is kept by its name, an own one by its colours. */
export function themeField(theme: Theme | null) {
  if (!theme) return undefined;
  return theme.id === "eget" ? theme : { id: theme.id };
}
