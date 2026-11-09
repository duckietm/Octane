import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { handlers, sendMessage } = vi.hoisted(() => ({ handlers: new Map<unknown, (event?: unknown) => void>(), sendMessage: vi.fn() }));

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
    GroupBadgePart: { serialize: () => 'badge' },
    HasHabboClub: () => true,
    LocalizeText: (key: string) => key,
    SendMessageComposer: sendMessage
}));
vi.mock('../../../hooks', () => ({ useMessageEvent: (type: unknown, handler: (event?: unknown) => void) => handlers.set(type, handler) }));
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
