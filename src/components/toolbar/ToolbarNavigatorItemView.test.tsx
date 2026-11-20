/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const links = vi.hoisted(() => [] as string[]);

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    CreateLinkEvent: (link: string) => links.push(link)
}));

import { NAVIGATOR_HOVER_ENTRIES, ToolbarNavigatorItemView } from './ToolbarNavigatorItemView';

afterEach(() => {
    cleanup();
    links.length = 0;
    vi.useRealTimers();
});

const icon = (container: HTMLElement) => container.querySelector('.icon-rooms') as HTMLElement;

describe('navigator toolbar icon', () => {
    it('lists the six official entries in their order', () => {
        expect(NAVIGATOR_HOVER_ENTRIES.map((entry) => entry.fallback)).toEqual([
            'Navigator',
            'Home room',
            'My favourites',
            'Create room',
            'Visited rooms',
            'Frequent visits'
        ]);
    });

    it('opens the menu on hover and raises the entry clicked, without toggling the navigator', () => {
        const { container } = render(<ToolbarNavigatorItemView />);

        expect(screen.queryByText('Create room')).toBeNull();

        fireEvent.mouseEnter(icon(container));
        fireEvent.click(screen.getByText('Create room'));

        expect(links).toEqual(['navigator/create']);
        expect(screen.queryByText('Create room')).toBeNull();
    });

    it('keeps the menu for half a second after the pointer leaves', () => {
        vi.useFakeTimers();

        const { container } = render(<ToolbarNavigatorItemView />);

        fireEvent.mouseEnter(icon(container));
        fireEvent.mouseLeave(icon(container));
        vi.advanceTimersByTime(400);
        expect(screen.queryByText('Navigator')).not.toBeNull();
    });

    it('still toggles the navigator on a click on the icon', () => {
        const { container } = render(<ToolbarNavigatorItemView />);

        fireEvent.click(icon(container));

        expect(links).toContain('navigator/toggle');
    });
});
