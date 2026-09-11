/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ChatInputReminderHintView } from './ChatInputReminderHintView';

describe('ChatInputReminderHintView', () => {
    afterEach(cleanup);

    it('tells a new user where to type', () => {
        render(<ChatInputReminderHintView visible={true} />);

        // The renderer stub has no texts, so the English fallback renders.
        expect(screen.getByRole('status')).toHaveTextContent('You can type here to talk!');
    });

    it('renders nothing once the reminder is over', () => {
        const { container } = render(<ChatInputReminderHintView visible={false} />);

        expect(container).toBeEmptyDOMElement();
    });
});
