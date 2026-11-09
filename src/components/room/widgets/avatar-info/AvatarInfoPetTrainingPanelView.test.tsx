import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarInfoPetTrainingPanelView } from './AvatarInfoPetTrainingPanelView';

const mocks = vi.hoisted(() => ({ handler: null as ((event: unknown) => void) | null, sendChatMessage: vi.fn() }));

vi.mock('@octane/renderer', () => ({ PetTrainingPanelMessageEvent: class {} }));

vi.mock('../../../../api', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../../../common', () => ({ LayoutPetImageView: () => <div data-testid="pet-image" /> }));

vi.mock('../../../../common/draggable-window', () => ({ DraggableWindow: ({ children }: { children: ReactNode }) => <div>{children}</div> }));

vi.mock('../../../../common/native-text/NativeText', () => ({ NativeText: ({ text }: { text: string }) => <span>{text}</span> }));

vi.mock('../../../mod-tools/native/NativeWindow3', () => ({
    Native3Frame: ({ height, width, children }: { height: number; width: number; children: ReactNode }) => (
        <section data-height={height} data-width={width} role="dialog">
            {children}
        </section>
    ),
    Native3Button: ({ x, y, label, enabled, onClick }: { x: number; y: number; label: string; enabled: boolean; onClick: () => void }) => (
        <button data-x={x} data-y={y} disabled={!enabled} type="button" onClick={onClick}>
            {label}
        </button>
    )
}));

vi.mock('../../../../hooks', () => ({
    useMessageEvent: (_type: unknown, handler: (event: unknown) => void) => {
        mocks.handler = handler;
    },
    useRoom: () => ({ roomSession: { userDataManager: { getPetData: () => ({ name: 'Rex', figure: '0 0 ffffff' }) }, sendChatMessage: mocks.sendChatMessage } }),
    useSessionInfo: () => ({ chatStyleId: 0 })
}));

const open = (commands: number[], enabledCommands: number[]) =>
    act(() => mocks.handler?.({ getParser: () => ({ petId: 5, commands, enabledCommands }) }));

describe('AvatarInfoPetTrainingPanelView', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('lays the commands out two a row as the official pet_commands window', () => {
        render(<AvatarInfoPetTrainingPanelView />);
        open([0, 1, 2, 3, 4], [0, 1, 2]);

        const buttons = screen.getAllByRole('button');

        expect(buttons.map((button) => [button.dataset.x, button.dataset.y])).toEqual([
            ['6', '103'],
            ['92', '103'],
            ['6', '128'],
            ['92', '128'],
            ['6', '153']
        ]);
        expect(screen.getByRole('dialog').dataset.width).toBe('195');
        expect(screen.getByRole('dialog').dataset.height).toBe(`${2 * 25 + 22 + 160}`);
        expect(buttons.map((button) => (button as HTMLButtonElement).disabled)).toEqual([false, false, false, true, true]);
    });

    it('says the command and holds every button for 1100ms', () => {
        render(<AvatarInfoPetTrainingPanelView />);
        open([0, 1], [0, 1]);

        fireEvent.click(screen.getByRole('button', { name: 'pet.command.1' }));

        expect(mocks.sendChatMessage).toHaveBeenCalledWith('Rex pet.command.1', 0);
        expect(screen.getAllByRole('button').every((button) => (button as HTMLButtonElement).disabled)).toBe(true);

        act(() => vi.advanceTimersByTime(1100));

        expect(screen.getAllByRole('button').some((button) => (button as HTMLButtonElement).disabled)).toBe(false);
    });
});
