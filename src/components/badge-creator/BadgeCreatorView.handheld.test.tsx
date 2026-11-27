/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const mocks = vi.hoisted(() => ({
    trackers: [] as { eventUrlPrefix: string; linkReceived: (url: string) => void }[]
}));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    AddLinkEventTracker: (tracker: (typeof mocks.trackers)[number]) => mocks.trackers.push(tracker),
    RemoveLinkEventTracker: (tracker: (typeof mocks.trackers)[number]) => mocks.trackers.splice(mocks.trackers.indexOf(tracker), 1)
}));

vi.mock('../../api', () => ({ LocalizeText: (key: string) => key }));
vi.mock('../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../api/badges', () => ({
    createCustomBadge: vi.fn(),
    deleteCustomBadge: vi.fn(),
    ensureCustomBadgeTexts: () => undefined,
    fetchCustomBadges: async () => ({ badges: [{ badgeId: 'CB1', name: 'First', description: 'Mine', url: 'badge.png' }], max: 5 }),
    refreshCustomBadgeTexts: () => undefined,
    setCustomBadgeText: () => undefined,
    updateCustomBadge: vi.fn()
}));

vi.mock('../../hooks', () => ({ useNotification: () => ({ showConfirm: vi.fn() }) }));

// The windows are DraggableWindow's business (and tested there); here each is a plain box that shows what it was given.
vi.mock('../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: React.ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));
vi.mock('../../common', () => {
    const Box = ({ children, className, style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
        <div className={className} style={style}>
            {children}
        </div>
    );

    return {
        Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
        Column: Box,
        Flex: Box,
        OctaneCardContentView: Box,
        OctaneCardHeaderView: ({ headerText }: { headerText: string }) => <h1>{headerText}</h1>,
        OctaneCardView: ({ children, className }: { children: React.ReactNode; className?: string }) => (
            <div className={className} data-testid="desktop-card">
                {children}
            </div>
        ),
        Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
    };
});
vi.mock('../../common/Tooltip', () => ({ Hint: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { BadgeCreatorView } from './BadgeCreatorView';

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));
const open = async () => {
    render(<BadgeCreatorView />);
    await act(async () => {
        mocks.trackers.forEach((tracker) => tracker.linkReceived('badge-creator/show'));
        await Promise.resolve();
    });
};
/** The canvas as a 400 px square at the top left: a cell is 10 px. */
const canvas = () => {
    const element = document.querySelector<HTMLElement>('.badge-creator-canvas');

    element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0, toJSON: () => ({}) });

    return element;
};
const touch = (clientX: number, clientY: number) => ({ touches: [{ clientX, clientY }] });

beforeEach(() => {
    mocks.trackers.length = 0;
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('BadgeCreatorView on a phone', () => {
    it('is a full-screen sheet in the phone frame, with the editor and the badges made so far', async () => {
        phone();
        await open();

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(document.querySelector('.octane-handheld-sheet.octane-handheld-badges')).toBeTruthy();
        expect(screen.queryByTestId('desktop-card')).toBeNull();

        const page = screen.getByTestId('handheld-badge-creator');

        expect(page.querySelector('.badge-creator-canvas')).toBeTruthy();
        expect(page.querySelectorAll('.badge-creator-swatch')).toHaveLength(32);
        expect(page.querySelector('.badge-creator-swatch[data-selected]')).toBeTruthy();
        expect(page.querySelectorAll('.badge-creator-list__row')).toHaveLength(1);
    });

    it('closes from the header', async () => {
        phone();
        await open();

        fireEvent.click(document.querySelector('.octane-handheld-sheet__caption-button.is-close'));

        expect(screen.queryByTestId('window')).toBeNull();
    });

    it('draws with a finger: an empty canvas cannot be saved, a touched one can', async () => {
        phone();
        await open();

        fireEvent.click(screen.getByText('Create badge'));
        expect(screen.getByText('Draw something first.')).toBeTruthy();

        fireEvent.touchStart(canvas(), touch(15, 25));
        fireEvent.touchMove(canvas(), touch(35, 25));

        // The finger has drawn: the mouse events a browser makes up after the tap are cancelled.
        expect(fireEvent.touchEnd(canvas(), { touches: [] })).toBe(false);

        await act(async () => {
            fireEvent.click(screen.getByText('Create badge'));
            await Promise.resolve();
        });

        expect(screen.queryByText('Draw something first.')).toBeNull();
    });

    it('does not draw while two fingers are down', async () => {
        phone();
        await open();

        fireEvent.touchStart(canvas(), {
            touches: [
                { clientX: 15, clientY: 25 },
                { clientX: 95, clientY: 25 }
            ]
        });
        fireEvent.touchMove(canvas(), touch(35, 25));
        fireEvent.click(screen.getByText('Create badge'));

        expect(screen.getByText('Draw something first.')).toBeTruthy();
    });
});

describe('BadgeCreatorView on the desktop', () => {
    it('keeps its card window and draws with the mouse', async () => {
        await open();

        expect(screen.getByTestId('desktop-card')).toBeTruthy();
        expect(document.querySelector('.octane-handheld-sheet')).toBeNull();

        fireEvent.mouseDown(canvas(), { button: 0, clientX: 15, clientY: 25 });

        await act(async () => {
            fireEvent.click(screen.getByText('Create badge'));
            await Promise.resolve();
        });

        expect(screen.queryByText('Draw something first.')).toBeNull();
    });
});
