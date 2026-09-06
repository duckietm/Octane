/**
 * The looks a wired box window can wear. The official client ships six (its default is "illumina");
 * the three whose layouts we have are reproduced colour for colour from them, and "default" is the
 * look this client had before the picker existed.
 */
export const WIRED_STYLE_DEFAULT = 'default';
export const WIRED_STYLE_OPTIONS = [WIRED_STYLE_DEFAULT, 'volter', 'ubuntu', 'volter_blue'] as const;

export type WiredStyleName = (typeof WIRED_STYLE_OPTIONS)[number];

export const normalizeWiredStyle = (value: unknown): WiredStyleName =>
    typeof value === 'string' && (WIRED_STYLE_OPTIONS as readonly string[]).includes(value) ? (value as WiredStyleName) : WIRED_STYLE_DEFAULT;

/** The class the window carries so the stylesheet can pick the skin: `octane-wired--style-volter`. */
export const wiredStyleClassName = (value: unknown): string => `octane-wired--style-${normalizeWiredStyle(value)}`;

/** "volter_blue" shown the way the official picker shows it: "Volter Blue". */
export const wiredStyleTitle = (value: string): string =>
    value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
