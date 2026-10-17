import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const setSelectedPrefix = vi.fn();
const createLinkEvent = vi.fn();
const activatePrefix = vi.fn();
const deactivatePrefix = vi.fn();
const prefix = { id: 4, text: 'Boss', color: '#ff0000', icon: '', effect: '', font: '', active: false };
const state = { prefixes: [prefix] as unknown[], selectedPrefix: null as unknown };

vi.mock('@octane/renderer', () => ({ CreateLinkEvent: createLinkEvent }));
vi.mock('../../../../api', () => ({
    getPrefixEffectStyle: () => ({}),
    getPrefixFontStyle: () => ({}),
    parsePrefixColors: (_text: string, color: string) => [color],
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));
vi.mock('../../../../assets/images/user_custom/nick_icons', () => ({ GetNickIconUrl: () => '' }));
vi.mock('../../../../common/scroll-area/ClassicScrollAreaView', () => ({ ClassicScrollAreaView: (props: { children: ReactNode }) => <div>{props.children}</div> }));
vi.mock('../../../../layout', () => ({
    OctaneButton: (props: { children: ReactNode; onClick: () => void; disabled?: boolean }) => (
        <button disabled={props.disabled} onClick={props.onClick}>
            {props.children}
        </button>
    )
}));
vi.mock('../InventoryCategoryEmptyView', () => ({
    InventoryCategoryEmptyView: (props: { title: string; actionLabel?: string; onAction?: () => void }) => (
        <div>
            {props.title}
            {props.onAction && <button onClick={props.onAction}>{props.actionLabel}</button>}
        </div>
    )
}));
vi.mock('../../../../hooks', () => ({
    useInventoryPrefixes: () => ({
        prefixes: state.prefixes,
        activePrefix: null,
        selectedPrefix: state.selectedPrefix,
        setSelectedPrefix,
        activatePrefix,
        deactivatePrefix,
        deletePrefix: vi.fn(),
        activate: () => 1,
        deactivate: vi.fn()
    }),
    useInventoryNickIcons: () => ({ nickIcons: [], activate: () => 1, deactivate: vi.fn() }),
    useNotification: () => ({ showConfirm: vi.fn() })
}));

const { InventoryPrefixView } = await import('./InventoryPrefixView');

afterEach(() => {
    cleanup();
    state.prefixes = [prefix];
    state.selectedPrefix = null;
});

describe('InventoryPrefixView', () => {
    it('selects a prefix from its cell and keeps the buttons off until one is selected', () => {
        render(<InventoryPrefixView />);

        expect((screen.getByText('Activate') as HTMLButtonElement).disabled).toBe(true);

        fireEvent.click(screen.getByText(/Boss/));

        expect(setSelectedPrefix).toHaveBeenCalledWith(prefix);
    });

    it('activates the selected prefix', () => {
        state.selectedPrefix = prefix;

        render(<InventoryPrefixView />);
        fireEvent.click(screen.getByText('Activate'));

        expect(activatePrefix).toHaveBeenCalledWith(4);
    });

    it('says so when there is no prefix', () => {
        state.prefixes = [];

        render(<InventoryPrefixView />);

        expect(screen.getByText('You have no prefixes')).toBeTruthy();
    });

    it('sends a user with no icons to the identity customizer, where they are bought', () => {
        render(<InventoryPrefixView />);
        fireEvent.click(screen.getByRole('tab', { name: 'Icons' }));
        fireEvent.click(screen.getByText('Customize identity'));

        expect(createLinkEvent).toHaveBeenCalledWith('customize/show');
    });
});
