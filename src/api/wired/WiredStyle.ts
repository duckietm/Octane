/**
 * The looks a wired box window can wear (official uibuilder/styles). The wired menu offers "default",
 * illumina and volter; "default" is stored as "" and means illumina. Three prototype furni force a
 * coloured Volter look of their own, whatever the user picked.
 */
export const WIRED_STYLE_DEFAULT = '';
export const WIRED_STYLE_OPTIONS = ['illumina', 'volter'] as const;

/** What the user picked, as the server stores it: "" (default), "illumina" or "volter". */
export type WiredStyleName = '' | (typeof WIRED_STYLE_OPTIONS)[number];

/** Every look a window can end up in. Ubuntu exists officially too, but only for the trade editor. */
export type WiredStyleSkin = 'illumina' | 'volter' | 'volter_yellow' | 'volter_blue' | 'volter_green';

/** Official determineActiveWiredStyle(): these furni classes always open in their own colours. */
export const WIRED_FORCED_STYLES: Readonly<Record<string, WiredStyleSkin>> = {
    wf_ltdproto_act_toggle_state: 'volter_yellow',
    wf_proto_trg_at_given_time: 'volter_blue',
    wf_proto_cnd_trggrer_on_frn: 'volter_green'
};

export interface WiredStyleTokens {
    /** The frame, and the header and buttons row around the inner border. */
    frameColor: string;
    /** Behind the sections; the same as the frame unless the style draws an inner border. */
    backgroundColor: string;
    advancedBackgroundColor: string;
    invalidInputBackgroundColor: string;
    textColor: string;
    softTextColor: string;
    yellowTextColor: string;
    redTextColor: string;
    warningTextColor: string;
    /** The ruler between sections. */
    splitterColor: string;
    /** Frame width before an element's width modifier. */
    frameWidth: number;
    sectionSpacing: number;
    sectionLeftRightMargin: number;
    headerNameFontSize: number;
    /** Volter header: type icon plus the whole name in one line, Volter font. */
    isVolter: boolean;
    /** The sections sit in a rounded inner border on the background colour, inside the frame colour. */
    useInnerBorder: boolean;
}

const VOLTER_PROTO = {
    invalidInputBackgroundColor: '#ffc6c9',
    textColor: '#222222',
    yellowTextColor: '#ffffaa',
    warningTextColor: '#b45f06',
    splitterColor: '#222222',
    frameWidth: 256,
    sectionSpacing: 4,
    sectionLeftRightMargin: 5,
    headerNameFontSize: 9,
    isVolter: true,
    useInnerBorder: true
};

/** Colour for colour from the AIR style classes and their wired_style_*.xml templates. */
export const WIRED_STYLE_TOKENS: Readonly<Record<WiredStyleSkin, WiredStyleTokens>> = {
    illumina: {
        frameColor: '#e2e2e2',
        backgroundColor: '#e2e2e2',
        advancedBackgroundColor: '#cccccc',
        invalidInputBackgroundColor: '#ffc6c9',
        textColor: '#000000',
        softTextColor: '#444444',
        yellowTextColor: '#727514',
        redTextColor: '#ed3033',
        warningTextColor: '#b45f06',
        splitterColor: '#aaaaaa',
        frameWidth: 240,
        sectionSpacing: 5,
        sectionLeftRightMargin: 5,
        headerNameFontSize: 12,
        isVolter: false,
        useInnerBorder: false
    },
    volter: {
        frameColor: '#3d3d3d',
        backgroundColor: '#3d3d3d',
        advancedBackgroundColor: '#303030',
        invalidInputBackgroundColor: '#ffc6c9',
        textColor: '#ffffff',
        softTextColor: '#cfcfcf',
        yellowTextColor: '#ffffaa',
        redTextColor: '#eda1a2',
        warningTextColor: '#ffb366',
        splitterColor: '#232323',
        frameWidth: 240,
        sectionSpacing: 4,
        sectionLeftRightMargin: 5,
        headerNameFontSize: 9,
        isVolter: true,
        useInnerBorder: false
    },
    // The proto styles set no soft or red text colour of their own (0, black).
    volter_yellow: {
        ...VOLTER_PROTO,
        frameColor: '#fac200',
        backgroundColor: '#faea7c',
        advancedBackgroundColor: '#f4d25f',
        softTextColor: '#000000',
        redTextColor: '#000000'
    },
    volter_blue: {
        ...VOLTER_PROTO,
        frameColor: '#7da9b5',
        backgroundColor: '#c7d0d4',
        advancedBackgroundColor: '#b1b9bd',
        softTextColor: '#000000',
        redTextColor: '#000000'
    },
    volter_green: {
        ...VOLTER_PROTO,
        frameColor: '#78b090',
        backgroundColor: '#bfd6c9',
        advancedBackgroundColor: '#acc7b7',
        softTextColor: '#000000',
        redTextColor: '#000000'
    }
};

/** A stored preference as the menu knows it; anything else (our old "default", "ubuntu", ...) is the default. */
export const normalizeWiredStyle = (value: unknown): WiredStyleName =>
    typeof value === 'string' && (WIRED_STYLE_OPTIONS as readonly string[]).includes(value) ? (value as WiredStyleName) : WIRED_STYLE_DEFAULT;

/** The look a box opens in: forced by its furni class, else the user's pick, else illumina. */
export const resolveWiredStyle = (preference: unknown, className?: string | null): WiredStyleSkin => {
    const forced = className ? WIRED_FORCED_STYLES[className] : undefined;

    if (forced) return forced;

    return normalizeWiredStyle(preference) || 'illumina';
};

/** The class the window carries so the stylesheet can pick the skin: `octane-wired--style-volter`. */
export const wiredStyleClassName = (skin: WiredStyleSkin): string => {
    const tokens = WIRED_STYLE_TOKENS[skin] ?? WIRED_STYLE_TOKENS.illumina;
    const classes = [`octane-wired--style-${WIRED_STYLE_TOKENS[skin] ? skin : 'illumina'}`];

    if (tokens.isVolter) classes.push('octane-wired--volter');
    if (tokens.useInnerBorder) classes.push('octane-wired--inner-border');

    return classes.join(' ');
};

/** The style's colours and spacings as the CSS variables WiredView.css reads. */
export const wiredStyleVariables = (skin: WiredStyleSkin): Record<string, string> => {
    const tokens = WIRED_STYLE_TOKENS[skin] ?? WIRED_STYLE_TOKENS.illumina;

    return {
        '--wired-frame': tokens.frameColor,
        '--wired-background': tokens.backgroundColor,
        '--wired-advanced-background': tokens.advancedBackgroundColor,
        '--wired-invalid-background': tokens.invalidInputBackgroundColor,
        '--wired-text': tokens.textColor,
        '--wired-soft-text': tokens.softTextColor,
        '--wired-yellow-text': tokens.yellowTextColor,
        '--wired-red-text': tokens.redTextColor,
        '--wired-warning-text': tokens.warningTextColor,
        '--wired-splitter': tokens.splitterColor,
        '--wired-section-spacing': `${tokens.sectionSpacing}px`,
        '--wired-section-margin': `${tokens.sectionLeftRightMargin}px`,
        '--wired-header-name-size': `${tokens.headerNameFontSize}px`
    };
};

/** "volter_blue" shown the way the official picker shows it (Util.snakeToTitle): "Volter Blue". */
export const wiredStyleTitle = (value: string): string =>
    value
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
