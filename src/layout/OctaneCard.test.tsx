/* @vitest-environment jsdom */

import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OctaneCardView } from '../common/card/OctaneCardView';
import { OctaneCard } from './OctaneCard';

vi.mock('../api', () => ({
    GetLocalStorage: () => null,
    SetLocalStorage: vi.fn()
}));

const WINDOW_PROPS = {
    handheldSheet: true,
    handheldScale: 0.6,
    handheldMaxScale: 1.5,
    handheldPeek: { label: 'room' },
    initialPosition: { x: 4, y: 8 },
    unconstrainedPosition: true,
    onPositionChange: () => {}
};
const LEAKED = ['handheldsheet', 'handheldscale', 'handheldmaxscale', 'handheldpeek', 'initialposition', 'unconstrainedposition', 'onpositionchange'];

/** Every attribute name in the document, lower-cased as the DOM keeps unknown ones. */
const attributeNames = () => [...document.querySelectorAll('*')].flatMap((element) => element.getAttributeNames().map((name) => name.toLowerCase()));

beforeEach(() => {
    const container = document.createElement('div');

    container.id = 'draggable-windows-container';
    document.body.appendChild(container);
});

afterEach(() => {
    cleanup();
    document.getElementById('draggable-windows-container')?.remove();
});

// The phone props (and the position ones) are the window's: a card hands them to DraggableWindow and never spreads
// them onto its own element, where React would write them out as stray attributes (handheldscale="0.6").
describe('cards keep the window props off the DOM', () => {
    it('OctaneCard', () => {
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <OctaneCard className="octane-test-card" uniqueKey="leak-card" {...WINDOW_PROPS}>
                <span>content</span>
            </OctaneCard>
        );

        expect(document.querySelector('.octane-test-card')).toBeTruthy();
        expect(attributeNames().filter((name) => LEAKED.includes(name))).toEqual([]);
        expect(errors.mock.calls.filter((call) => String(call[0]).includes('React does not recognize'))).toEqual([]);
        errors.mockRestore();
    });

    it('OctaneCardView', () => {
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <OctaneCardView className="octane-test-card-view" uniqueKey="leak-card-view" {...WINDOW_PROPS}>
                <span>content</span>
            </OctaneCardView>
        );

        expect(document.querySelector('.octane-test-card-view')).toBeTruthy();
        expect(attributeNames().filter((name) => LEAKED.includes(name))).toEqual([]);
        expect(errors.mock.calls.filter((call) => String(call[0]).includes('React does not recognize'))).toEqual([]);
        errors.mockRestore();
    });
});
