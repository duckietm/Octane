import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvatarInfoRentableBotChatView } from './AvatarInfoRentableBotChatView';

const mocks = vi.hoisted(() => ({ sendMessageComposer: vi.fn() }));

vi.mock('@octane/renderer', () => ({
    BotSkillSaveComposer: class {
        public args: unknown[];

        constructor(...args: unknown[]) {
            this.args = args;
        }
    }
}));

vi.mock('../../../../api', () => ({
    BotSkillsEnum: { SETUP_CHAT: 2 },
    GetBotSkillWindowPosition: () => ({ x: 0, y: 0 }),
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    GetRoomObjectBounds: () => null,
    GetRoomSession: () => null,
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
    OpenUrl: vi.fn(),
    SendMessageComposer: mocks.sendMessageComposer
}));

vi.mock('../../../../common', () => ({
    DraggableWindow: ({ children }: { children: ReactNode }) => <div data-testid="draggable">{children}</div>,
    DraggableWindowPosition: { NOTHING: 'NOTHING' }
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const chatEvent = { objectId: 3, category: 100, botId: 77, chat: 'hello', automaticChat: true, mixSentences: false, chatDelay: 5 } as any;

describe('AvatarInfoRentableBotChatView', () => {
    it('draws both checkboxes in the right-hand column of their row', () => {
        render(<AvatarInfoRentableBotChatView chatEvent={chatEvent} onClose={vi.fn()} />);

        const boxes = screen.getAllByRole('checkbox');

        expect(boxes).toHaveLength(2);
        for (const box of boxes) {
            expect(box).toHaveClass('air-bot-skill-checkbox');
            expect(box.closest('.air-bot-skill-row')).not.toBeNull();
        }
    });

    it('saves the text, the two switches and the delay', () => {
        const onClose = vi.fn();

        render(<AvatarInfoRentableBotChatView chatEvent={chatEvent} onClose={onClose} />);
        fireEvent.click(screen.getByRole('checkbox', { name: 'bot.skill.chatter.configuration.markov' }));
        fireEvent.click(screen.getByRole('button', { name: 'save' }));

        expect(mocks.sendMessageComposer.mock.calls[0][0].args).toEqual([77, 2, 'hello;#;true;#;5;#;true']);
        expect(onClose).toHaveBeenCalled();
    });
});
