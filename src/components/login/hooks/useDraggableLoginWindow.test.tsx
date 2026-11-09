import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FC, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loginWindowStorageKey, useDraggableLoginWindow } from './useDraggableLoginWindow';

const Harness: FC<{ id: string }> = ({ id }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { style, dragging, handleProps } = useDraggableLoginWindow(id, ref);

    return (
        <div data-testid="window" ref={ref} style={style} className={dragging ? 'is-dragging' : ''}>
            <div data-testid="handle" {...handleProps}>
                <span>Title</span>
                <button type="button">Action</button>
            </div>
        </div>
    );
};

describe('useDraggableLoginWindow', () => {
    beforeEach(() => window.localStorage.clear());
    afterEach(cleanup);

    it('defaults to the styled spot when nothing is stored', () => {
        render(<Harness id="auth" />);

        const win = screen.getByTestId('window');

        expect(win.style.getPropertyValue('--login-drag-x')).toBe('0px');
        expect(win.style.getPropertyValue('--login-drag-y')).toBe('0px');
    });

    it('drags by the handle, stores per window id and restores it', () => {
        render(<Harness id="auth" />);

        const handle = screen.getByTestId('handle');
        const win = screen.getByTestId('window');

        fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 50, clientY: 50 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 80, clientY: 20 });
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: 80, clientY: 20 });

        expect(win.style.getPropertyValue('--login-drag-x')).toBe('30px');
        expect(win.style.getPropertyValue('--login-drag-y')).toBe('-30px');
        expect(JSON.parse(window.localStorage.getItem(loginWindowStorageKey('auth')))).toEqual({ x: 30, y: -30 });

        cleanup();
        render(<Harness id="auth" />);

        expect(screen.getByTestId('window').style.getPropertyValue('--login-drag-x')).toBe('30px');
    });

    it('does not start a drag from a button inside the handle', () => {
        render(<Harness id="register" />);

        const handle = screen.getByTestId('handle');
        const button = screen.getByRole('button', { name: 'Action' });

        fireEvent.pointerDown(button, { button: 0, pointerId: 1, clientX: 50, clientY: 50 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 90, clientY: 90 });

        expect(screen.getByTestId('window').style.getPropertyValue('--login-drag-x')).toBe('0px');
        expect(window.localStorage.getItem(loginWindowStorageKey('register'))).toBeNull();
    });
});
