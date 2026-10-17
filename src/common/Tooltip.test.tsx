import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tooltip } from './Tooltip';

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
        // Base UI portals the popup into the body, inside a positioner wrapper.
        expect(document.body.contains(bubble)).toBe(true);
        expect(bubble.closest('.octane-tooltip-positioner')).not.toBeNull();
        expect(bubble.getAttribute('data-side')).toBeTruthy();

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

    it('keeps an explicit placement on its side', () => {
        const { rerender } = render(
            <Tooltip content="Hint" delay={0} placement="below">
                <button type="button">Target</button>
            </Tooltip>
        );

        fireEvent.focus(screen.getByRole('button', { name: 'Target' }));
        expect(screen.getByRole('tooltip').getAttribute('data-side')).toBe('bottom');

        fireEvent.blur(screen.getByRole('button', { name: 'Target' }));
        rerender(
            <Tooltip content="Hint" delay={0} placement="above">
                <button type="button">Target</button>
            </Tooltip>
        );

        fireEvent.focus(screen.getByRole('button', { name: 'Target' }));
        expect(screen.getByRole('tooltip').getAttribute('data-side')).toBe('top');
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
