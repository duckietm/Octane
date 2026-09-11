import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveTooltipPlacement, resolveTooltipPosition, TOOLTIP_EDGE, TOOLTIP_GAP, Tooltip } from './Tooltip';

describe('tooltip placement', () => {
    it('goes above while the bubble and its 10px gap fit, below otherwise', () => {
        expect(resolveTooltipPlacement('auto', 100, 20)).toBe('above');
        expect(resolveTooltipPlacement('auto', 30, 20)).toBe('below');
        expect(resolveTooltipPlacement('below', 100, 20)).toBe('below');
        expect(resolveTooltipPlacement('above', 0, 20)).toBe('above');
    });

    it('centres on the target with the official gap and clamps to the viewport', () => {
        const anchor = { top: 100, left: 50, width: 40, height: 20 };
        const bubble = { width: 60, height: 22 };

        expect(resolveTooltipPosition(anchor, bubble, 'auto', 800)).toEqual({ side: 'above', top: 100 - 22 - TOOLTIP_GAP, left: 40 });
        expect(resolveTooltipPosition(anchor, bubble, 'below', 800)).toEqual({ side: 'below', top: 100 + 20 + TOOLTIP_GAP, left: 40 });
        expect(resolveTooltipPosition({ ...anchor, left: 0 }, bubble, 'auto', 800).left).toBe(TOOLTIP_EDGE);
        expect(resolveTooltipPosition({ ...anchor, left: 790 }, bubble, 'auto', 800).left).toBe(800 - 60 - TOOLTIP_EDGE);
    });
});

describe('Tooltip', () => {
    beforeEach(() => vi.useFakeTimers());

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('shows the skinned bubble after the delay and hides it when the pointer leaves', () => {
        render(
            <Tooltip content="Open the navigator" delay={250}>
                <button type="button">Navigator</button>
            </Tooltip>
        );

        fireEvent.mouseEnter(screen.getByRole('button', { name: 'Navigator' }));
        expect(screen.queryByRole('tooltip')).toBeNull();

        act(() => {
            vi.advanceTimersByTime(250);
        });

        const bubble = screen.getByRole('tooltip');
        expect(bubble).toHaveTextContent('Open the navigator');
        expect(bubble.classList.contains('octane-tooltip')).toBe(true);
        // jsdom reports a 0x0 target at the top of the screen, so there is no room above.
        expect(bubble.classList.contains('octane-tooltip--below')).toBe(true);
        expect(bubble.parentElement).toBe(document.body);

        fireEvent.mouseLeave(screen.getByRole('button', { name: 'Navigator' }));
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('opens on keyboard focus without waiting when the delay is 0', () => {
        render(
            <Tooltip content="Hint" delay={0}>
                <button type="button">Target</button>
            </Tooltip>
        );

        fireEvent.focus(screen.getByRole('button', { name: 'Target' }));
        expect(screen.getByRole('tooltip')).toHaveTextContent('Hint');

        fireEvent.blur(screen.getByRole('button', { name: 'Target' }));
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('never opens while disabled or without content', () => {
        const { rerender } = render(
            <Tooltip content="Hint" delay={0} disabled>
                <button type="button">Target</button>
            </Tooltip>
        );

        fireEvent.mouseEnter(screen.getByRole('button', { name: 'Target' }));
        expect(screen.queryByRole('tooltip')).toBeNull();

        rerender(
            <Tooltip content={null} delay={0}>
                <button type="button">Target</button>
            </Tooltip>
        );

        fireEvent.mouseEnter(screen.getByRole('button', { name: 'Target' }));
        expect(screen.queryByRole('tooltip')).toBeNull();
    });

    it('keeps a block anchor full width so wrapped buttons do not shrink', () => {
        const { container } = render(
            <Tooltip block content="Hint">
                <button type="button">Target</button>
            </Tooltip>
        );

        const anchor = container.firstElementChild as HTMLElement;
        expect(anchor.tagName).toBe('DIV');
        expect(anchor.classList.contains('flex-col')).toBe(true);
    });
});
