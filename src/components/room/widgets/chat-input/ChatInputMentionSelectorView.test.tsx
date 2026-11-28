import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';

vi.mock('../../../../common', () => ({ LayoutAvatarImageView: () => null }));

import { ChatInputMentionSelectorView } from './ChatInputMentionSelectorView';

const suggestions = [
    { key: 'a', kind: 'alias' as const, name: 'everyone', insertToken: '@everyone' },
    { key: 'b', kind: 'user' as const, name: 'Bobby', insertToken: '@Bobby', figure: 'hd-180' }
];

beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
    cleanup();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('ChatInputMentionSelectorView', () => {
    it('keeps the desktop popover off a phone', () => {
        const { container } = render(<ChatInputMentionSelectorView selectedIndex={0} suggestions={suggestions} onHover={() => {}} onSelect={() => {}} />);

        expect(container.querySelector('.chat-input-mention-popover')?.className).toBe('chat-input-mention-popover');
    });

    it('is the phone list on a phone and still picks on the press, keeping the field focused', () => {
        const onSelect = vi.fn();

        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        const { container } = render(<ChatInputMentionSelectorView selectedIndex={0} suggestions={suggestions} onHover={() => {}} onSelect={onSelect} />);

        expect(container.querySelector('.chat-input-mention-popover')).toHaveClass('is-handheld');

        const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

        fireEvent(screen.getAllByRole('option')[1], press);

        expect(press.defaultPrevented).toBe(true);
        expect(onSelect).toHaveBeenCalledWith(suggestions[1]);
    });
});
