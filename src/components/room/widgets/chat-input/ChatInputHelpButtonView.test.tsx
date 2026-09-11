/* @vitest-environment jsdom */

import { CreateLinkEvent } from '@octane/renderer';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CHAT_COMMANDS_HELP_LINK, ChatInputHelpButtonView } from './ChatInputHelpButtonView';

describe('ChatInputHelpButtonView', () => {
    beforeEach(() => vi.mocked(CreateLinkEvent).mockClear());

    afterEach(cleanup);

    it('opens the chat commands page', () => {
        render(<ChatInputHelpButtonView />);

        fireEvent.click(screen.getByRole('button', { name: 'Help' }));

        expect(CreateLinkEvent).toHaveBeenCalledWith(CHAT_COMMANDS_HELP_LINK);
        expect(CHAT_COMMANDS_HELP_LINK).toBe('habbopages/chat/commands');
    });
});
