/* @vitest-environment jsdom */

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DraggableWindow } from './DraggableWindow';

vi.mock('../../api', () => ({
    GetLocalStorage: () => null,
    SetLocalStorage: vi.fn()
}));

const pressEscape = (target: EventTarget = document.body, prevent = false) => {
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    if (prevent) event.preventDefault();

    act(() => {
        target.dispatchEvent(event);
        vi.runAllTimers();
    });
};

const Window = ({ name, onClose, children = null }: { name: string; onClose: () => void; children?: React.ReactNode }) => (
    <DraggableWindow uniqueKey={name}>
        <div>
            <span>{name}</span>
            <button className="octane-card-close-button" onClick={onClose}>
                close {name}
            </button>
            {children}
        </div>
    </DraggableWindow>
);

beforeEach(() => {
    const container = document.createElement('div');

    container.id = 'draggable-windows-container';
    document.body.appendChild(container);
});

afterEach(() => {
    cleanup();
    document.getElementById('draggable-windows-container')?.remove();
});

describe('DraggableWindow Escape', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('closes only the window on top', () => {
        const first = vi.fn();
        const second = vi.fn();

        render(
            <>
                <Window name="first" onClose={first} />
                <Window name="second" onClose={second} />
            </>
        );

        pressEscape();

        expect(second).toHaveBeenCalledTimes(1);
        expect(first).not.toHaveBeenCalled();
    });

    it('leaves the windows alone while the user types in a field', () => {
        const onClose = vi.fn();
        const { getByRole } = render(
            <Window name="typing" onClose={onClose}>
                <input aria-label="text" />
            </Window>
        );

        pressEscape(getByRole('textbox', { name: 'text' }));

        expect(onClose).not.toHaveBeenCalled();
    });

    it('leaves the windows alone when a menu or dialog already used the key', () => {
        const onClose = vi.fn();

        render(<Window name="menu" onClose={onClose} />);
        pressEscape(document.body, true);

        expect(onClose).not.toHaveBeenCalled();
    });

    it('leaves the windows alone when a listener added later handles the key', () => {
        const onClose = vi.fn();

        render(<Window name="later" onClose={onClose} />);

        const handleLater = (event: KeyboardEvent) => event.preventDefault();

        window.addEventListener('keydown', handleLater);
        pressEscape();
        window.removeEventListener('keydown', handleLater);

        expect(onClose).not.toHaveBeenCalled();
    });

    it('stops listening once the last window is gone', () => {
        const onClose = vi.fn();
        const { unmount } = render(<Window name="gone" onClose={onClose} />);

        unmount();
        pressEscape();

        expect(onClose).not.toHaveBeenCalled();
    });
});

describe('DraggableWindow viewport resize', () => {
    it('brings a window back inside when the viewport shrinks', () => {
        const width = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000);
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);

        render(
            <DraggableWindow initialPosition={{ x: 900, y: 100 }}>
                <div>moved</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        expect(element.style.transform).toBe('translate3d(900px, 100px, 0)');

        width.mockReturnValue(500);
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        expect(element.style.transform).toBe('translate3d(500px, 100px, 0)');

        vi.restoreAllMocks();
    });
});
