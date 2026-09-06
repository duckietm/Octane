import { type CSSProperties, type RefObject, useLayoutEffect, useMemo, useState } from 'react';

const CATALOG_WINDOW_BASE_WIDTH = 570;
const CATALOG_WINDOW_HEIGHT = 635;
const CATALOG_WINDOW_MAX_WIDTH = 1040;
// Bordi finestra (2+2) + padding contenuto card + margine ultimo tab + margine di
// sicurezza per evitare che l'ultima categoria venga clippata dall'overflow:hidden.
const CATALOG_FRAME_PADDING = 28;
/**
 * Set on the tab shell when the categories no longer fit even at the maximum width. Only then
 * are the tabs allowed to shrink; the measurement below always runs without it, because a tab
 * squeezed by the window cannot be used to decide how wide that window should be.
 */
const CONDENSED_CLASS = 'is-condensed';

/** Sum tab widths (margins INCLUDED) — never use shell.scrollWidth (infinite growth loop). */
const measureCatalogTabStripWidth = (shell: HTMLElement) => {
    // Read the tabs at their natural width. Removing and restoring the class inside one task
    // means the browser never paints the intermediate state.
    const wasCondensed = shell.classList.contains(CONDENSED_CLASS);

    if (wasCondensed) shell.classList.remove(CONDENSED_CLASS);

    const tabs = shell.querySelectorAll<HTMLElement>('.octane-card-tab-item');
    let tabsWidth = 0;

    tabs.forEach((tab) => {
        const style = window.getComputedStyle(tab);
        const marginX = Number.parseFloat(style.marginLeft || '0') + Number.parseFloat(style.marginRight || '0');

        // offsetWidth esclude i margini: vanno sommati o l'ultima tab viene tagliata.
        tabsWidth += tab.offsetWidth + marginX;
    });

    const shellStyle = window.getComputedStyle(shell);
    const paddingX = Number.parseFloat(shellStyle.paddingLeft) + Number.parseFloat(shellStyle.paddingRight);

    if (wasCondensed) shell.classList.add(CONDENSED_CLASS);

    return Math.ceil(tabsWidth + paddingX);
};

export const useCatalogWindowWidth = (
    tabsShellRef: RefObject<HTMLElement | null>,
    enabled: boolean,
    ...remeasureDeps: unknown[]
) => {
    const [stripWidth, setStripWidth] = useState(CATALOG_WINDOW_BASE_WIDTH);

    useLayoutEffect(() => {
        if (!enabled) return;

        const shell = tabsShellRef.current;
        if (!shell) return;

        const measure = () => {
            const needed = measureCatalogTabStripWidth(shell) + CATALOG_FRAME_PADDING;
            const next = Math.min(CATALOG_WINDOW_MAX_WIDTH, Math.max(CATALOG_WINDOW_BASE_WIDTH, needed));

            setStripWidth((current) => (current === next ? current : next));
            // Beyond the ceiling the strip cannot be shown whole: let the tabs give way rather
            // than let the last categories disappear under the shell's overflow.
            shell.classList.toggle(CONDENSED_CLASS, needed > CATALOG_WINDOW_MAX_WIDTH);
        };

        measure();
        // Ri-misura dopo che font/icone delle tab hanno preso la larghezza finale
        // (al primo layout le tab possono risultare piu' strette del reale).
        const rafId = requestAnimationFrame(measure);

        const tabObserver = new ResizeObserver(measure);

        const observeTabs = () => {
            shell.querySelectorAll<HTMLElement>('.octane-card-tab-item').forEach((tab) => {
                tabObserver.observe(tab);
            });
        };

        observeTabs();

        const listObserver = new MutationObserver(() => {
            tabObserver.disconnect();
            observeTabs();
            measure();
        });

        listObserver.observe(shell, { childList: true, subtree: false });
        window.addEventListener('resize', measure);

        return () => {
            cancelAnimationFrame(rafId);
            tabObserver.disconnect();
            listObserver.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [enabled, tabsShellRef, ...remeasureDeps]);

    return useMemo(() => {
        const width = stripWidth;

        return {
            '--octane-catalog-window-width': `${width}px`,
            '--octane-catalog-window-height': `${CATALOG_WINDOW_HEIGHT}px`,
            width: `${width}px`,
            minWidth: `${width}px`,
            maxWidth: `${width}px`
        } as CSSProperties;
    }, [stripWidth]);
};

export const parseCatalogTabLabel = (label: string) => {
    const trimmed = (label || '').trim();
    const match = trimmed.match(/^(.*?)(?:\s*\((\d+)\))\s*$/);

    if (!match) {
        return { name: trimmed, count: null as number | null };
    }

    const name = match[1].trim();
    const count = Number.parseInt(match[2], 10);

    return {
        name: name || trimmed,
        count: Number.isFinite(count) ? count : null
    };
};
