import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AvatarInfoRentableBotTextSkillView } from './AvatarInfoRentableBotTextSkillView';

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
    BotSkillsEnum: { CHANGE_BOT_NAME: 5, CHANGE_BOT_MOTTO: 9 },
    GetBotSkillWindowPosition: () => ({ x: 0, y: 0 }),
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    GetRoomObjectBounds: () => null,
    GetRoomSession: () => null,
    LocalizeText: (key: string) => key,
    localizeWithFallback: (_key: string, fallback: string) => fallback,
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

const createEvent = (skillType: number, text: string) => ({ objectId: 3, category: 100, botId: 77, skillType, text }) as any;

describe('AvatarInfoRentableBotTextSkillView', () => {
    it('opens name_configuration with the current name and saves the edited one', () => {
        const onClose = vi.fn();

        render(<AvatarInfoRentableBotTextSkillView skillEvent={createEvent(5, 'Frank')} onClose={onClose} />);

        expect(document.querySelector('.air-bot-skill-window--name')).not.toBeNull();
        expect(screen.getByText('bot.skill.name.configuration.title')).toBeInTheDocument();

        const input = screen.getByDisplayValue('Frank') as HTMLInputElement;

        expect(input.maxLength).toBe(15);

        fireEvent.change(input, { target: { value: 'Frits' } });
        fireEvent.click(screen.getByText('save'));

        expect(mocks.sendMessageComposer).toHaveBeenCalledTimes(1);
        expect(mocks.sendMessageComposer.mock.calls[0][0].args).toEqual([77, 5, 'Frits']);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('uses the same window for the motto and closes on cancel without saving', () => {
        const onClose = vi.fn();

        render(<AvatarInfoRentableBotTextSkillView skillEvent={createEvent(9, 'Hello')} onClose={onClose} />);

        expect(screen.getByText('Change motto')).toBeInTheDocument();
        expect((screen.getByDisplayValue('Hello') as HTMLInputElement).maxLength).toBe(38);

        fireEvent.click(screen.getByText('cancel'));

        expect(mocks.sendMessageComposer).not.toHaveBeenCalled();
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
