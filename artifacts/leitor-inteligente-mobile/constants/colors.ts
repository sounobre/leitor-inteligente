/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#283348',
    tint: '#5169e8',

    // Core surfaces
    background: '#f7f3e9',
    foreground: '#283348',

    // Cards / elevated surfaces
    card: '#fffdf8',
    cardForeground: '#283348',

    // Primary action color (buttons, links, active states)
    primary: '#5169e8',
    primaryForeground: '#fffdf8',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#d2e7df',
    secondaryForeground: '#1f4e4b',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#ece6d8',
    mutedForeground: '#717784',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#f59a58',
    accentForeground: '#283348',

    // Destructive actions (delete, error states)
    destructive: '#d54c48',
    destructiveForeground: '#fffdf8',

    // Borders and input outlines
    border: '#dfd8c7',
    input: '#dfd8c7',
    ink: '#283348',
    seafoam: '#d2e7df',
    orange: '#f59a58',
  },

  dark: {
    text: '#f7f3e9',
    tint: '#9aa9ff',
    background: '#111214',
    foreground: '#f7f3e9',
    card: '#191a1c',
    cardForeground: '#f7f3e9',
    primary: '#9d8cff',
    primaryForeground: '#111214',
    secondary: '#173f36',
    secondaryForeground: '#d5f5e6',
    muted: '#292b2e',
    mutedForeground: '#b5b6bc',
    accent: '#25e875',
    accentForeground: '#111214',
    destructive: '#fa7772',
    destructiveForeground: '#202938',
    border: '#303237',
    input: '#303237',
    ink: '#f7f3e9',
    seafoam: '#173f36',
    orange: '#25e875',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 20,
};

export default colors;
