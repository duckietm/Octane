import { AddLinkEventTracker, CreateLinkEvent, GetLocalizationManager } from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoom } from '../../../../hooks';
import { useWiredRewardStore, WIRED_REWARD_MAX_OPEN } from '../../../../hooks/rooms/widgets/wiredRewardStore';
import { FurnitureWiredChestRewardView, wiredRewardHasCredits, wiredRewardOffset } from './FurnitureWiredChestRewardView';

vi.mock('../../../../hooks', () => ({ useRoom: vi.fn() }));
vi.mock('../../../../common/layout/LayoutCurrencyIcon', () => ({ LayoutCurrencyIcon: () => <i className="currency" /> }));

const coins = { type: 0 as const, amount: 25, itemType: null };
const chair = { type: 1 as const, amount: 1, itemType: { isWallItem: false, typeId: 30, legacyPosterId: '' } };

const texts: Record<string, string> = {
    'wiredrewards.earnings': 'Je kunt de credits claimen in het <a href="event:habboUI/open/vault">verdien venster</a>',
};

let stub: any;

beforeEach(() => {
    vi.clearAllMocks();
    stub = vi.mocked(GetLocalizationManager).getMockImplementation();
    vi.mocked(GetLocalizationManager).mockReturnValue({ getValueWithParameters: (key: string) => texts[key] ?? key } as any);
    vi.mocked(useRoom).mockReturnValue({ roomSession: { roomId: 7 } } as any);
    useWiredRewardStore.setState({ receipts: {}, open: [], nextId: 1 });
});

afterEach(() => {
    cleanup();
    vi.mocked(GetLocalizationManager).mockImplementation(stub);
});

describe('wired reward popups (AIR RewardNotificationController / View)', () => {
    it('keeps every reward under its own id and opens the one its notification names', () => {
        render(<FurnitureWiredChestRewardView />);

        let first = 0;
        let second = 0;
        act(() => {
            first = useWiredRewardStore.getState().add([chair], 'First');
            second = useWiredRewardStore.getState().add([coins], 'Second');
        });
        expect([first, second]).toEqual([1, 2]);

        // The link of the first notification opens the first reward, not the newest one.
        const tracker = vi.mocked(AddLinkEventTracker).mock.calls.at(-1)[0];
        act(() => {
            tracker.linkReceived(`wiredchestreward/open/${ first }`);
        });

        expect(screen.getByText('First')).toBeInTheDocument();
        expect(screen.queryByText('Second')).toBeNull();

        act(() => {
            tracker.linkReceived(`wiredchestreward/open/${ second }`);
        });
        expect(screen.getByText('Second')).toBeInTheDocument();
        expect(screen.getByText('First')).toBeInTheDocument();
    });

    it('tells where the credits went and links coins to the earnings window, furni to the inventory', () => {
        render(<FurnitureWiredChestRewardView />);

        act(() => {
            const id = useWiredRewardStore.getState().add([coins, chair], '');
            useWiredRewardStore.getState().openReward(id);
        });

        expect(document.body.textContent).toContain('Je kunt de credits claimen in het verdien venster');
        expect(document.body.textContent).not.toContain('<a');

        fireEvent.click(screen.getByRole('button', { name: 'verdien venster' }));
        expect(CreateLinkEvent).toHaveBeenLastCalledWith('habboUI/open/vault');

        fireEvent.click(screen.getByRole('button', { name: '1' }));
        expect(CreateLinkEvent).toHaveBeenLastCalledWith('inventory/show');
        fireEvent.click(screen.getByRole('button', { name: '25' }));
        expect(CreateLinkEvent).toHaveBeenLastCalledWith('habboUI/open/vault');
    });

    it('a furni-only reward has no earnings line', () => {
        render(<FurnitureWiredChestRewardView />);

        act(() => {
            useWiredRewardStore.getState().openReward(useWiredRewardStore.getState().add([chair], 'Chair'));
        });

        expect(document.body.textContent).not.toContain('verdien venster');
        expect(wiredRewardHasCredits([chair])).toBe(false);
        expect(wiredRewardHasCredits([chair, coins])).toBe(true);
    });

    it('opens at most ten windows, staggered as AIR does, and forgets the room\'s rewards with the room', () => {
        const store = useWiredRewardStore.getState();
        for (let i = 0; i < WIRED_REWARD_MAX_OPEN + 2; i++) store.openReward(store.add([chair], `R${ i }`));

        expect(useWiredRewardStore.getState().open).toHaveLength(WIRED_REWARD_MAX_OPEN);
        expect(useWiredRewardStore.getState().open[0]).toBe(3);
        expect([0, 1, 2, 3, 4].map(wiredRewardOffset)).toEqual([0, 25, -25, 50, -50]);

        const { rerender } = render(<FurnitureWiredChestRewardView />);
        vi.mocked(useRoom).mockReturnValue({ roomSession: { roomId: 8 } } as any);
        rerender(<FurnitureWiredChestRewardView />);

        expect(useWiredRewardStore.getState().open).toEqual([]);
        expect(useWiredRewardStore.getState().receipts).toEqual({});
    });
});
