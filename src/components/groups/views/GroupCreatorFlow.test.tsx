import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { handlers, sendMessage, customize } = vi.hoisted(() => ({
    handlers: new Map<unknown, (event?: unknown) => void>(),
    sendMessage: vi.fn(),
    customize: { value: null as unknown }
}));

vi.mock('@octane/renderer', () => ({
    CreateLinkEvent: vi.fn(),
    GroupBadgePartsComposer: class {},
    GroupBuyComposer: class {},
    GroupBuyDataComposer: class {},
    GroupBuyDataEvent: class {},
    GroupInformationComposer: class {},
    GroupPurchasedEvent: class {},
    GroupSaveBadgeComposer: class {},
    GroupSaveColorsComposer: class {},
    GroupSaveInformationComposer: class {},
    GuildEditFailedMessageEvent: class {},
    PurchaseErrorMessageEvent: class {}
}));

vi.mock('../../../api', async () => {
    const { GroupBadgePart } = await vi.importActual<typeof import('../../../api/groups/GroupBadgePart')>('../../../api/groups/GroupBadgePart');

    return {
        CreateLinkEvent: vi.fn(),
        GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
        GetGroupMembers: vi.fn(),
        GetLocalStorage: () => null,
        SetLocalStorage: vi.fn(),
        GroupBadgePart,
        HasHabboClub: () => true,
        LocalizeText: (key: string) => key,
        SendMessageComposer: sendMessage,
        localizeWithFallback: (key: string, fallback: string) => fallback ?? key
    };
});

vi.mock('../../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event?: unknown) => void) => handlers.set(type, handler),
    useGroup: () => ({ groupCustomize: customize.value }),
    useNotification: () => ({ simpleAlert: vi.fn() })
}));

// The badge preview needs the renderer's badge textures, which the step-by-step flow does not check.
vi.mock('../../../common', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../common')>()),
    LayoutBadgeImageView: () => null
}));

import { GroupBuyComposer, GroupBuyDataEvent } from '@octane/renderer';
import { selectOption } from '../../../test-utils/selectOption';
import { GroupCreatorView } from './GroupCreatorView';

// The shape GroupBuyDataParser builds: a room map and the server's default badge layers.
const buyDataParser = () => ({
    groupCost: 10,
    availableRooms: new Map<number, string>([[5, 'Mijn kamer']]),
    badgeParts: [
        { isBase: true, key: 1, color: 1, position: 4 },
        { isBase: false, key: 10, color: 1, position: 4 },
        { isBase: false, key: 0, color: 1, position: 4 },
        { isBase: false, key: 0, color: 1, position: 4 },
        { isBase: false, key: 0, color: 1, position: 4 }
    ]
});

const buyCount = () => sendMessage.mock.calls.filter(([composer]) => composer instanceof GroupBuyComposer).length;

describe('group creator purchase flow', () => {
    beforeEach(() => {
        sendMessage.mockClear();
        handlers.clear();
        customize.value = {
            badgeBases: [{ id: 1, images: ['a', 'b'] }],
            badgeSymbols: [{ id: 10, images: ['a', 'b'] }],
            badgePartColors: [
                { id: 1, color: 'ffffff' },
                { id: 2, color: '000000' }
            ],
            groupColorsA: [{ id: 0, color: 'ffffff' }],
            groupColorsB: [{ id: 0, color: 'ffffff' }]
        };
    });

    afterEach(() => cleanup());

    it('walks identity, badge, colors and confirmation and sends the buy', () => {
        render(<GroupCreatorView onClose={vi.fn()} />);

        act(() => handlers.get(GroupBuyDataEvent)({ getParser: buyDataParser }));

        fireEvent.change(screen.getByRole('textbox', { name: 'group.edit.name' }), { target: { value: 'Mijn groep' } });
        selectOption(screen.getByRole('combobox', { name: 'group.edit.base' }), 'Mijn kamer');

        fireEvent.click(screen.getByRole('button', { name: 'group.create.nextstep' }));
        fireEvent.click(screen.getByRole('button', { name: 'group.create.nextstep' }));
        fireEvent.click(screen.getByRole('button', { name: 'group.create.nextstep' }));

        const buy = screen.getByRole('button', { name: 'group.create.confirm.buy' });

        expect(buy).toBeEnabled();

        fireEvent.click(buy);

        expect(buyCount()).toBe(1);
    });
});
