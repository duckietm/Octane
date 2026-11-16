import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    sendMessageComposer: vi.fn(),
    handlers: new Map<unknown, (event: unknown) => void>()
}));

vi.mock('@octane/renderer', () => {
    class Keep {
        public args: unknown[];

        constructor(...args: unknown[]) {
            this.args = args;
        }
    }

    return {
        BotCommandConfigurationEvent: class {},
        BotDialogueEvent: class {},
        BotDialogueOpenComposer: class extends Keep {},
        BotDialogueChooseComposer: class extends Keep {},
        BotDialogueWindowEvent: class {},
        BotRemoveComposer: Keep,
        BotSkillSaveComposer: Keep,
        CreateLinkEvent: vi.fn(),
        RequestBotCommandConfigurationComposer: Keep,
        RoomObjectCategory: { UNIT: 100 },
        RoomObjectType: { RENTABLE_BOT: 4 }
    };
});

vi.mock('../../../../../api', () => ({
    BotSkillsEnum: {},
    DispatchUiEvent: vi.fn(),
    getRentableBotCommandButtons: () => [],
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    RoomWidgetUpdateRentableBotChatEvent: class {},
    RoomWidgetUpdateRentableBotTextSkillEvent: class {},
    SendMessageComposer: mocks.sendMessageComposer
}));

vi.mock('../../../../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler),
    useWiredTools: () => ({ openInspectionForUser: vi.fn(), showInspectButton: false })
}));

vi.mock('../../context-menu/ContextMenuView', () => ({
    ContextMenuView: ({ children }: { children: ReactNode }) => <div data-testid="menu">{children}</div>
}));

import { BotDialogueChooseComposer, BotDialogueEvent, BotDialogueOpenComposer, BotDialogueWindowEvent } from '@octane/renderer';
import { AvatarInfoWidgetRentableBotView } from './AvatarInfoWidgetRentableBotView';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.handlers.clear();
});

const bot = { webID: -7, roomIndex: 3, name: 'Clerk', amIOwner: false, amIAnyRoomController: false, botSkills: [], botSkillsWithCommands: [] } as any;

const page = (botId: number, nonce: number, text: string, options: string[]) => {
    act(() => mocks.handlers.get(BotDialogueEvent)?.({ getParser: () => ({ botId, nonce, text, options, closed: nonce === 0 }) }));
};

const sent = (type: unknown) => mocks.sendMessageComposer.mock.calls.map(([composer]) => composer).filter((composer) => composer instanceof (type as never));

describe('AvatarInfoWidgetRentableBotView dialogue', () => {
    it('asks the bot for its dialogue when the menu opens', () => {
        render(<AvatarInfoWidgetRentableBotView avatarInfo={bot} onClose={vi.fn()} />);

        expect(sent(BotDialogueOpenComposer).map((composer: any) => composer.args)).toEqual([[-7]]);
    });

    it('shows what the bot says and sends the option picked with the page code', () => {
        render(<AvatarInfoWidgetRentableBotView avatarInfo={bot} onClose={vi.fn()} />);
        page(-7, 42, 'What do you need?', ['Bread', 'Goodbye']);

        expect(screen.getByText('What do you need?')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Goodbye' }));

        expect(sent(BotDialogueChooseComposer).map((composer: any) => composer.args)).toEqual([[-7, 42, 1]]);
    });

    it('ignores another bot and closes the menu when the dialogue ends', () => {
        const onClose = vi.fn();

        render(<AvatarInfoWidgetRentableBotView avatarInfo={bot} onClose={onClose} />);
        page(-8, 42, 'Not mine', ['X']);

        expect(screen.queryByText('Not mine')).toBeNull();

        page(-7, 0, '', []);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('gives way to the window of the bot when it has nothing else to show', () => {
        const onClose = vi.fn();
        const windowFor = (botId: number) => act(() => mocks.handlers.get(BotDialogueWindowEvent)?.({ getParser: () => ({ botId, nonce: 9, closed: false }) }));

        render(<AvatarInfoWidgetRentableBotView avatarInfo={bot} onClose={onClose} />);
        windowFor(-8);

        expect(onClose).not.toHaveBeenCalled();

        windowFor(-7);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('stays open for the room owner when the window opens', () => {
        const onClose = vi.fn();

        render(<AvatarInfoWidgetRentableBotView avatarInfo={{ ...bot, amIOwner: true }} onClose={onClose} />);
        act(() => mocks.handlers.get(BotDialogueWindowEvent)?.({ getParser: () => ({ botId: -7, nonce: 9, closed: false }) }));

        expect(onClose).not.toHaveBeenCalled();
    });
});
