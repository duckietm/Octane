/* @vitest-environment jsdom */

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';
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

describe('DraggableWindow in the phone layout', () => {
    const goHandheld = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

    beforeEach(() => {
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
    });

    afterEach(() => {
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        vi.restoreAllMocks();
    });

    it('places a desktop window exactly as before while the phone layout is off', () => {
        render(
            <DraggableWindow initialPosition={{ x: 30, y: 40 }}>
                <div>desktop</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        expect(element.style.transform).toBe('translate3d(30px, 40px, 0)');
        expect(element.hasAttribute('data-handheld-window')).toBe(false);
        expect(element.style.width).toBe('');
    });

    it('centres a window that fits the phone as a dialog, ignoring the stored position', () => {
        goHandheld();
        render(
            <DraggableWindow initialPosition={{ x: 300, y: 700 }}>
                <div>dialog</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        // jsdom has no layout, so the window measures as the 340 x 462 default; 60 px are kept for the toolbar.
        expect(element.getAttribute('data-handheld-window')).toBe('dialog');
        expect(element.style.transform).toBe('translate3d(25px, 161px, 0)');
    });

    it('turns a window wider than the phone into a sheet over the usable area', () => {
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(600);
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(500);
        goHandheld();
        render(
            <DraggableWindow>
                <div>sheet</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        expect(element.getAttribute('data-handheld-window')).toBe('sheet');
        expect(element.style.transform).toBe('translate3d(0px, 0px, 0)');
        expect(element.style.width).toBe('390px');
        expect(element.style.height).toBe('784px');
    });

    it('does not drag on a phone', () => {
        goHandheld();
        render(
            <DraggableWindow>
                <div>
                    <div className="drag-handler">handle</div>
                </div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;
        const before = element.style.transform;
        const handle = document.querySelector('.drag-handler') as HTMLElement;

        act(() => {
            handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 10 }));
            handle.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 120, clientY: 160 }));
            handle.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 120, clientY: 160 }));
        });

        expect(element.style.transform).toBe(before);
    });
    it('keeps a sheet window a sheet even when it would fit as a dialog', () => {
        goHandheld();
        render(
            <DraggableWindow handheldSheet>
                <div>friends</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        expect(element.getAttribute('data-handheld-window')).toBe('sheet');
        expect(element.style.width).toBe('390px');
        expect(element.style.height).toBe('784px');
    });

    it('draws a fixed-layout window smaller and centres it when it then fits', () => {
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(490);
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(523);
        goHandheld();
        render(
            <DraggableWindow handheldScale={0.75}>
                <div>editor</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        expect(element.getAttribute('data-handheld-window')).toBe('scaled');
        expect(element.style.getPropertyValue('--octane-handheld-scale')).toBe('0.771');
        expect(element.hasAttribute('data-handheld-pan')).toBe(false);
        expect(element.style.width).toBe('');
        // 490 x 523 at 0.771 is 378 x 403, centred in the 390 x 784 area.
        expect(element.style.transform).toBe('translate3d(6px, 191px, 0)');
    });

    it('pans a fixed-layout window that is still too big at its smallest scale', () => {
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1103);
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(722);
        goHandheld();
        render(
            <DraggableWindow handheldScale={0.6}>
                <div>reward track</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        expect(element.getAttribute('data-handheld-window')).toBe('scaled');
        expect(element.style.getPropertyValue('--octane-handheld-scale')).toBe('0.6');
        expect(element.hasAttribute('data-handheld-pan')).toBe(true);
        expect(element.style.width).toBe('390px');
        expect(element.style.height).toBe('784px');
    });

    it('ignores the phone props on desktop', () => {
        render(
            <DraggableWindow handheldSheet handheldScale={0.6} initialPosition={{ x: 30, y: 40 }}>
                <div>desktop</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        expect(element.style.transform).toBe('translate3d(30px, 40px, 0)');
        expect(element.hasAttribute('data-handheld-window')).toBe(false);
        expect(element.hasAttribute('data-handheld-pan')).toBe(false);
        expect(element.style.getPropertyValue('--octane-handheld-scale')).toBe('');
    });

    it('ends a sheet above the on-screen keyboard while one of its fields has the focus', () => {
        goHandheld();
        const { getByRole } = render(
            <DraggableWindow handheldSheet>
                <div>
                    <input aria-label="message" />
                </div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        act(() => getByRole('textbox', { name: 'message' }).focus());
        act(() => useHandheldStore.setState({ keyboardInset: 336 }));

        expect(element.style.height).toBe('508px');

        act(() => useHandheldStore.setState({ keyboardInset: 0 }));

        expect(element.style.height).toBe('784px');
    });

    it('stays put when the keyboard opens for a field outside it', () => {
        goHandheld();
        render(
            <>
                <input aria-label="chat" />
                <DraggableWindow handheldSheet>
                    <div>sheet</div>
                </DraggableWindow>
            </>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        act(() => (document.querySelector('input') as HTMLInputElement).focus());
        act(() => useHandheldStore.setState({ keyboardInset: 336 }));

        expect(element.style.height).toBe('784px');

        act(() => useHandheldStore.setState({ keyboardInset: 0 }));
    });
});

describe('DraggableWindow, phone layout stage 4', () => {
    const goHandheld = () => act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));

    beforeEach(() => {
        vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
        vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
    });

    afterEach(() => {
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        vi.restoreAllMocks();
    });

    it('draws a small fixed-layout window bigger when it may grow', () => {
        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(256);
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(300);
        goHandheld();
        render(
            <DraggableWindow handheldMaxScale={1.35} handheldScale={0.75}>
                <div>wired</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        expect(element.getAttribute('data-handheld-window')).toBe('scaled');
        expect(element.style.getPropertyValue('--octane-handheld-scale')).toBe('1.35');
        // Marked as a fixed-coordinate frame, so its labels keep their own sizes.
        expect(element.hasAttribute('data-handheld-fixed')).toBe(true);
    });

    it('shows no peek controls on desktop', () => {
        render(
            <DraggableWindow handheldPeek={{ label: 'Wired' }}>
                <div>wired</div>
            </DraggableWindow>
        );

        expect(document.querySelector('.octane-handheld-peek-button')).toBeNull();
        expect(document.querySelector('.octane-handheld-peek-bar')).toBeNull();
        expect(document.querySelector('.draggable-window')?.hasAttribute('data-handheld-fixed')).toBe(false);
    });

    it('puts a window aside on a phone and brings it back from the bar, keeping its content mounted', () => {
        goHandheld();
        render(
            <DraggableWindow handheldPeek={{ label: 'Wired', hint: 'Furni picked: 1 / 5' }}>
                <input aria-label="value" defaultValue="kept" />
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;
        const button = document.querySelector('.octane-handheld-peek-button') as HTMLElement;

        expect(button).not.toBeNull();
        act(() => button.click());

        expect(element.hasAttribute('data-handheld-peeked')).toBe(true);
        expect(document.querySelector('.octane-handheld-peek-bar')?.textContent).toContain('Furni picked: 1 / 5');
        expect((element.querySelector('input') as HTMLInputElement).value).toBe('kept');

        act(() => (document.querySelector('.octane-handheld-peek-bar__button') as HTMLElement).click());

        expect(element.hasAttribute('data-handheld-peeked')).toBe(false);
        expect(document.querySelector('.octane-handheld-peek-bar')).toBeNull();
    });

    it('hides the window while the feature uses the room, and the bar ends that', () => {
        const onReturn = vi.fn();

        goHandheld();
        render(
            <DraggableWindow handheldPeek={{ label: 'Area', forced: true, onReturn }}>
                <div>area</div>
            </DraggableWindow>
        );

        expect(document.querySelector('.draggable-window')?.hasAttribute('data-handheld-peeked')).toBe(true);
        expect(document.querySelector('.octane-handheld-peek-button')).toBeNull();

        act(() => (document.querySelector('.octane-handheld-peek-bar__button') as HTMLElement).click());

        expect(onReturn).toHaveBeenCalledTimes(1);
    });

    it('fits a dialog again when its content grows past the screen', () => {
        let height = 300;
        let resized: () => void = () => undefined;

        vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(300);
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(() => height);
        vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: 300, height, left: 0, top: 0, right: 300, bottom: height, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect);
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: () => void) {
                    resized = callback;
                }
                observe() {}
                disconnect() {}
            }
        );
        goHandheld();
        render(
            <DraggableWindow>
                <div>grows</div>
            </DraggableWindow>
        );

        const element = document.querySelector('.draggable-window') as HTMLElement;

        expect(element.getAttribute('data-handheld-window')).toBe('dialog');

        height = 900;
        act(() => resized());

        expect(element.getAttribute('data-handheld-window')).toBe('sheet');
        vi.unstubAllGlobals();
    });
});
