import { useHandheldStore } from '../../state/handheldStore';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { HandheldForce, HandheldLayout, parseHandheldForce, resolveHandheldLayout, resolveKeyboardInset } from './handheldLayout';

/** `?handheld=on|off|auto` sets (or clears) a choice that this browser then remembers. */
export const HANDHELD_QUERY_PARAM = 'handheld';
export const HANDHELD_FORCE_STORAGE_KEY = 'octane.handheld.force';
export const HANDHELD_CONFIG_KEY = 'ui.handheld.enabled';

/** The attribute on <html> the handheld stylesheet keys on: `portrait` / `landscape`, absent on desktop. */
export const HANDHELD_ROOT_ATTRIBUTE = 'data-handheld';
export const HANDHELD_KEYBOARD_ATTRIBUTE = 'data-handheld-keyboard';
export const HANDHELD_KEYBOARD_PROPERTY = '--octane-keyboard-inset';

const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'number', 'password', '']);

let stopWatching: (() => void) | null = null;

const readForce = (): HandheldForce => {
    try {
        const fromQuery = parseHandheldForce(new URLSearchParams(window.location.search).get(HANDHELD_QUERY_PARAM));

        if (fromQuery === 'auto') {
            window.localStorage.removeItem(HANDHELD_FORCE_STORAGE_KEY);
            return null;
        }

        if (fromQuery) {
            window.localStorage.setItem(HANDHELD_FORCE_STORAGE_KEY, fromQuery);
            return fromQuery;
        }

        const stored = parseHandheldForce(window.localStorage.getItem(HANDHELD_FORCE_STORAGE_KEY));

        return stored === 'on' || stored === 'off' ? stored : null;
    } catch {
        return null;
    }
};

const readEnabled = (): boolean => {
    try {
        return GetConfigurationValue<boolean>(HANDHELD_CONFIG_KEY, true) !== false;
    } catch {
        return true;
    }
};

const matches = (query: string): boolean => {
    try {
        return !!window.matchMedia?.(query).matches;
    } catch {
        return false;
    }
};

export const isTextFieldFocused = (element: Element | null = document.activeElement): boolean => {
    if (!element) return false;
    if (element instanceof HTMLTextAreaElement) return true;
    if (element instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(element.type);

    return element instanceof HTMLElement && element.isContentEditable;
};

/** Writes the layout onto <html>, so the stylesheet switches with no React render in between. */
export const applyHandheldRootAttributes = (root: HTMLElement, layout: HandheldLayout): void => {
    if (layout.active) root.setAttribute(HANDHELD_ROOT_ATTRIBUTE, layout.orientation);
    else root.removeAttribute(HANDHELD_ROOT_ATTRIBUTE);
};

const applyKeyboard = (root: HTMLElement, inset: number): void => {
    root.style.setProperty(HANDHELD_KEYBOARD_PROPERTY, `${inset}px`);

    if (inset > 0) root.setAttribute(HANDHELD_KEYBOARD_ATTRIBUTE, 'open');
    else root.removeAttribute(HANDHELD_KEYBOARD_ATTRIBUTE);
};

/**
 * Measures the device, keeps the handheld store and the <html> attributes up to date, and follows
 * rotation, resizes, a mouse being attached and the on-screen keyboard. Safe to call more than once.
 * Returns the function that stops it (tests use it).
 */
export const startHandheldWatcher = (): (() => void) => {
    if (stopWatching) return stopWatching;
    if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

    const root = document.documentElement;
    const enabled = readEnabled();
    const forced = readForce();
    const store = useHandheldStore.getState();

    const measureLayout = () => {
        const layout = resolveHandheldLayout({
            width: window.innerWidth,
            height: window.innerHeight,
            coarsePointer: matches('(pointer: coarse)'),
            finePointerAttached: matches('(any-pointer: fine)'),
            enabled,
            forced
        });

        store.setLayout(layout);
        applyHandheldRootAttributes(root, layout);

        return layout;
    };

    const measureKeyboard = () => {
        const viewport = window.visualViewport;
        const active = useHandheldStore.getState().layout.active;
        const inset =
            active && viewport
                ? resolveKeyboardInset({
                      layoutHeight: window.innerHeight,
                      visualHeight: viewport.height,
                      visualOffsetTop: viewport.offsetTop,
                      textFieldFocused: isTextFieldFocused()
                  })
                : 0;

        store.setKeyboardInset(inset);
        applyKeyboard(root, inset);
    };

    const update = () => {
        measureLayout();
        measureKeyboard();
    };

    // The keyboard opens a moment after the focus moves; the viewport resize event follows it.
    const onFocusChange = () => window.setTimeout(measureKeyboard, 0);

    // iOS Safari zooms the whole page on a pinch even with the viewport locked; the room pinches on its own.
    const onGesture = (event: Event) => {
        if (useHandheldStore.getState().layout.active) event.preventDefault();
    };

    const mediaQueries = ['(pointer: coarse)', '(any-pointer: fine)'].map((query) => {
        try {
            return window.matchMedia?.(query) ?? null;
        } catch {
            return null;
        }
    });

    update();

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', measureKeyboard);
    window.visualViewport?.addEventListener('scroll', measureKeyboard);
    document.addEventListener('focusin', onFocusChange);
    document.addEventListener('focusout', onFocusChange);
    document.addEventListener('gesturestart', onGesture, { passive: false });
    for (const query of mediaQueries) query?.addEventListener?.('change', update);

    stopWatching = () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('orientationchange', update);
        window.visualViewport?.removeEventListener('resize', measureKeyboard);
        window.visualViewport?.removeEventListener('scroll', measureKeyboard);
        document.removeEventListener('focusin', onFocusChange);
        document.removeEventListener('focusout', onFocusChange);
        document.removeEventListener('gesturestart', onGesture);
        for (const query of mediaQueries) query?.removeEventListener?.('change', update);

        stopWatching = null;
    };

    return stopWatching;
};
