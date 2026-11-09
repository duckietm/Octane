import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const configuration = new Map<string, unknown>();

vi.mock('../../../../api', () => ({
    GetConfigurationValue: (key: string, fallback: unknown) => (configuration.has(key) ? configuration.get(key) : fallback),
    localizeWithFallback: (_key: string, fallback: string) => fallback
}));

vi.mock('../../../../common/LazyEmojiPicker', () => ({
    LazyEmojiPicker: (props: { onEmojiSelect: (emoji: { native: string }) => void }) => (
        <button type="button" onClick={() => props.onEmojiSelect({ native: '🎉' })}>
            party popper
        </button>
    )
}));

import { ChatInputEmojiSelectorView } from './ChatInputEmojiSelectorView';

describe('ChatInputEmojiSelectorView', () => {
    beforeEach(() => configuration.clear());

    afterEach(() => cleanup());

    it('shows the smiley button and appends the picked emoji to the chat', () => {
        const addChatEmoji = vi.fn();

        render(<ChatInputEmojiSelectorView addChatEmoji={addChatEmoji} />);

        const trigger = screen.getByRole('button', { name: 'Emoji' });

        expect(trigger.textContent).toBe('🙂');

        fireEvent.click(trigger);
        fireEvent.click(screen.getByText('party popper'));

        expect(addChatEmoji).toHaveBeenCalledWith('🎉');
        expect(screen.queryByText('party popper')).toBeNull();
    });

    it('stays hidden when chat.emoji.enabled is off', () => {
        configuration.set('chat.emoji.enabled', false);

        render(<ChatInputEmojiSelectorView addChatEmoji={vi.fn()} />);

        expect(screen.queryByRole('button', { name: 'Emoji' })).toBeNull();
    });
});
