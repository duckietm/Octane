import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ current: null as { name: string; text: string; local?: boolean } | null }));

vi.mock('../../hooks', () => ({
    useHelpBubbles: () => ({ current: mocks.current, isLast: true, closeBubble: vi.fn(), skipBubble: vi.fn() })
}));

import { UiHelpBubblesView } from './UiHelpBubblesView';

/** The navigator icon the bubble points at, with a size (jsdom lays nothing out). */
const addAnchor = () => {
    const element = document.createElement('div');

    element.className = 'icon-rooms';
    element.getBoundingClientRect = () => ({ left: 40, top: 500, width: 40, height: 40, right: 80, bottom: 540, x: 40, y: 500, toJSON: () => ({}) }) as DOMRect;
    document.body.appendChild(element);
};

describe('UiHelpBubblesView', () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = '';
    });

    it('dims the client around the element for a step of the server script', () => {
        addAnchor();
        mocks.current = { name: 'NAVIGATOR', text: 'Here' };
        render(<UiHelpBubblesView />);

        expect(document.querySelector('.octane-help-bubble')).not.toBeNull();
        expect(document.querySelectorAll('.octane-help-bubbles__dim')).toHaveLength(4);
    });

    it("leaves the rest of the client clickable around this client's own hint", () => {
        addAnchor();
        mocks.current = { name: 'NAVIGATOR', text: 'Here', local: true };
        render(<UiHelpBubblesView />);

        expect(document.querySelector('.octane-help-bubble')).not.toBeNull();
        expect(document.querySelectorAll('.octane-help-bubbles__dim')).toHaveLength(0);
    });
});
