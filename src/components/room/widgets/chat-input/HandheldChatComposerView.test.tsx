import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../api/utils/localizeWithFallback', () => ({
    localizeWithFallback: (_key: string, fallback: string, parameters?: string[], replacements?: string[]) => (parameters ? fallback.replace(`%${parameters[0]}%`, replacements[0]) : fallback)
}));

import { HandheldChatComposerView } from './HandheldChatComposerView';

afterEach(cleanup);

const composer = (overrides: Partial<ComponentProps<typeof HandheldChatComposerView>> = {}) => {
    const props: ComponentProps<typeof HandheldChatComposerView> = {
        mode: 'say',
        onModeChange: vi.fn(),
        recipient: '',
        candidates: ['Alice', 'Bob'],
        recipientListOpen: false,
        onRecipientListToggle: vi.fn(),
        onRecipientChange: vi.fn(),
        canSend: true,
        onSend: vi.fn(),
        onClose: vi.fn(),
        styleSelector: <i data-testid="style" />,
        field: <input aria-label="field" type="text" />,
        pickers: <i data-testid="pickers" />,
        suggestions: null,
        ...overrides
    };

    render(<HandheldChatComposerView {...props} />);

    return props;
};

const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed');

describe('HandheldChatComposerView (phone chat composer)', () => {
    it('shows the three modes as one segmented control with the chosen one pressed', () => {
        composer({ mode: 'shout' });

        const modes = within(screen.getByRole('group', { name: 'Chat mode' })).getAllByRole('button');

        expect(modes.map((button) => button.textContent)).toEqual(['Say', 'Shout', 'Whisper']);
        expect([pressed('Say'), pressed('Shout'), pressed('Whisper')]).toEqual(['false', 'true', 'false']);
    });

    it('reports the tapped mode', () => {
        const props = composer();

        fireEvent.click(screen.getByRole('button', { name: 'Whisper' }));
        fireEvent.click(screen.getByRole('button', { name: 'Shout' }));

        expect(vi.mocked(props.onModeChange).mock.calls).toEqual([['whisper'], ['shout']]);
    });

    it('lays the field row out as style chooser, text, pickers, send', () => {
        composer();

        const pill = document.querySelector('.octane-handheld-composer__pill');

        expect(Array.from(pill.children).map((child) => child.getAttribute('data-testid') ?? child.getAttribute('aria-label') ?? child.textContent)).toEqual(['style', 'field', 'pickers', 'Send']);
    });

    it('sends from the green button and closes from the red one', () => {
        const props = composer();

        fireEvent.click(screen.getByRole('button', { name: 'Send' }));
        fireEvent.click(screen.getByRole('button', { name: 'Close chat' }));

        expect(props.onSend).toHaveBeenCalledTimes(1);
        expect(props.onClose).toHaveBeenCalledTimes(1);
    });

    it('keeps the cursor in the field when a mode or Send is tapped, so the keyboard stays up', () => {
        composer();

        for (const name of ['Say', 'Shout', 'Whisper', 'Send']) expect(fireEvent.mouseDown(screen.getByRole('button', { name })), name).toBe(false);
    });

    it('cannot send while flood blocked', () => {
        composer({ canSend: false });

        expect(screen.getByRole('button', { name: 'Send' }).hasAttribute('disabled')).toBe(true);
    });

    it('marks the whisper segment while it has nobody to go to, and shows no recipient outside whisper mode', () => {
        composer();

        expect(screen.getByRole('button', { name: 'Whisper' }).getAttribute('data-needs-recipient')).toBe('true');
        expect(document.querySelector('.octane-handheld-composer__recipient')).toBeNull();
    });

    it('names the whisper recipient next to the modes and opens the list from it', () => {
        const props = composer({ mode: 'whisper', recipient: 'Bob' });
        const chip = screen.getByRole('button', { name: 'Whisper to Bob' });

        expect(chip.textContent).toBe('Bob');
        expect(chip.getAttribute('aria-expanded')).toBe('false');
        expect(screen.getByRole('button', { name: 'Whisper' }).hasAttribute('data-needs-recipient')).toBe(false);

        fireEvent.click(chip);

        expect(props.onRecipientListToggle).toHaveBeenCalledTimes(1);
    });

    it('lists the room players to whisper to, the current one selected', () => {
        const props = composer({ mode: 'whisper', recipient: 'Bob', recipientListOpen: true });
        const options = within(screen.getByRole('listbox', { name: 'Whisper to' })).getAllByRole('option');

        expect(options.map((option) => [option.textContent, option.getAttribute('aria-selected')])).toEqual([
            ['Alice', 'false'],
            ['Bob', 'true']
        ]);

        fireEvent.click(options[0]);

        expect(props.onRecipientChange).toHaveBeenCalledWith('Alice');
    });

    it('says so when nobody else is in the room', () => {
        composer({ mode: 'whisper', candidates: [], recipientListOpen: true });

        expect(screen.queryByRole('listbox')).toBeNull();
        expect(screen.getByText('Nobody else is in the room')).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Whisper to' }).textContent).toBe('Choose');
    });
});
