import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { handlers, sendMessage, club, badge, simpleAlert } = vi.hoisted(() => ({
    handlers: new Map<unknown, (event?: unknown) => void>(),
    sendMessage: vi.fn(),
    club: { value: true },
    badge: { serializable: true },
    simpleAlert: vi.fn()
}));

vi.mock('@octane/renderer', () => ({
    GroupBadgePartsComposer: class {},
    GroupBuyComposer: class {},
    GroupBuyDataComposer: class {},
    GroupBuyDataEvent: class {},
    GroupPurchasedEvent: class {},
    GuildEditFailedMessageEvent: class {},
    PurchaseErrorMessageEvent: class {}
}));
vi.mock('../../../api', () => ({
    CreateLinkEvent: vi.fn(),
    GroupBadgePart: { serialize: () => (badge.serializable ? 'badge' : null) },
    HasHabboClub: () => club.value,
    LocalizeText: (key: string) => key,
    SendMessageComposer: sendMessage,
    localizeWithFallback: (key: string, fallback: string) => fallback ?? key
}));
vi.mock('../../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event?: unknown) => void) => handlers.set(type, handler),
    useNotification: () => ({ simpleAlert })
}));
vi.mock('./GroupNativeLayout', () => ({
    flatText: () => ({}),
    GroupBox: ({ children }: { children?: unknown }) => <>{children}</>,
    GroupButton: ({ label, onClick }: { label: string; onClick: () => void }) => (
        <button type="button" onClick={onClick}>
            {label}
        </button>
    ),
    GroupText: () => null
}));
vi.mock('./GroupManagementWindow', () => ({ GroupManagementWindow: ({ children }: { children?: unknown }) => <>{children}</> }));
vi.mock('./tabs/GroupTabBadgeView', () => ({ GroupTabBadgeView: () => null }));
vi.mock('./tabs/GroupTabColorsView', () => ({ GroupTabColorsView: () => null }));
vi.mock('./tabs/GroupTabCreatorConfirmationView', () => ({ GroupTabCreatorConfirmationView: () => null }));
vi.mock('./tabs/GroupTabIdentityView', () => ({ GroupTabIdentityView: () => null }));

import { GroupBuyComposer, GroupPurchasedEvent, GuildEditFailedMessageEvent } from '@octane/renderer';
import { GroupCreatorView } from './GroupCreatorView';

const buyCount = () => sendMessage.mock.calls.filter(([composer]) => composer instanceof GroupBuyComposer).length;

const openBuyStep = () => {
    for (let step = 1; step < 4; step++) fireEvent.click(screen.getByRole('button', { name: 'group.create.nextstep' }));
};

describe('GroupCreatorView buy lock', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        sendMessage.mockClear();
        handlers.clear();
        club.value = true;
        badge.serializable = true;
        simpleAlert.mockClear();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it('sends one buy until the server answers, then allows another', () => {
        render(<GroupCreatorView onClose={vi.fn()} />);
        openBuyStep();

        const buy = screen.getByRole('button', { name: 'group.create.confirm.buy' });

        fireEvent.click(buy);
        fireEvent.click(buy);
        expect(buyCount()).toBe(1);

        act(() => handlers.get(GuildEditFailedMessageEvent)());
        fireEvent.click(buy);
        expect(buyCount()).toBe(2);
    });

    it('lets a player without Habbo Club buy: the server decides whether a group may be sold', () => {
        club.value = false;

        render(<GroupCreatorView onClose={vi.fn()} />);
        openBuyStep();

        const buy = screen.getByRole('button', { name: 'group.create.confirm.buy' });

        expect(buy).toBeEnabled();

        fireEvent.click(buy);
        expect(buyCount()).toBe(1);
    });

    it('says why nothing happens when the badge has no base', () => {
        badge.serializable = false;

        render(<GroupCreatorView onClose={vi.fn()} />);
        openBuyStep();
        fireEvent.click(screen.getByRole('button', { name: 'group.create.confirm.buy' }));

        expect(buyCount()).toBe(0);
        expect(simpleAlert).toHaveBeenCalledWith('Choose a base for the badge.');
    });

    it('does not carry the lock into a creator opened again', () => {
        const first = render(<GroupCreatorView onClose={vi.fn()} />);

        openBuyStep();
        fireEvent.click(screen.getByRole('button', { name: 'group.create.confirm.buy' }));
        first.unmount();

        expect(vi.getTimerCount()).toBe(0);

        render(<GroupCreatorView onClose={vi.fn()} />);
        openBuyStep();
        fireEvent.click(screen.getByRole('button', { name: 'group.create.confirm.buy' }));

        expect(buyCount()).toBe(2);
        act(() => handlers.get(GroupPurchasedEvent)());
        expect(vi.getTimerCount()).toBe(0);
    });
});
