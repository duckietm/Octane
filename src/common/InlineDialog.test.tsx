/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InlineDialog, InlineDialogTitle } from './InlineDialog';

describe('InlineDialog', () => {
    afterEach(() => cleanup());

    it('renders a dialog through the given element, keeping its classes and aria label', () => {
        render(
            <InlineDialog aria-label="Confirm" className="panel" render={<section />}>
                <button type="button">Ok</button>
            </InlineDialog>
        );

        const dialog = screen.getByRole('dialog', { name: 'Confirm' });

        expect(dialog.tagName).toBe('SECTION');
        expect(dialog.classList.contains('panel')).toBe(true);
        expect(screen.getByRole('button', { name: 'Ok' })).toBeTruthy();
    });

    it('names itself from InlineDialogTitle', () => {
        render(
            <InlineDialog>
                <InlineDialogTitle>Delete this?</InlineDialogTitle>
            </InlineDialog>
        );

        expect(screen.getByRole('dialog', { name: 'Delete this?' })).toBeTruthy();
    });

    it('asks to close on Escape', () => {
        const onClose = vi.fn();

        render(
            <InlineDialog aria-label="Esc" onClose={onClose}>
                <button type="button">Ok</button>
            </InlineDialog>
        );
        fireEvent.keyDown(screen.getByRole('button', { name: 'Ok' }), { key: 'Escape' });

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('leaves Escape alone when the content owns it', () => {
        const onClose = vi.fn();

        render(
            <InlineDialog aria-label="Own" closeOnEscape={false} onClose={onClose}>
                <button type="button">Ok</button>
            </InlineDialog>
        );
        fireEvent.keyDown(screen.getByRole('button', { name: 'Ok' }), { key: 'Escape' });

        expect(onClose).not.toHaveBeenCalled();
    });

    it('does not close on an outside press', () => {
        const onClose = vi.fn();

        render(
            <div>
                <button type="button">Outside</button>
                <InlineDialog aria-label="Stay" onClose={onClose} />
            </div>
        );
        fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
        fireEvent.mouseDown(screen.getByRole('button', { name: 'Outside' }));
        fireEvent.click(screen.getByRole('button', { name: 'Outside' }));

        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole('dialog', { name: 'Stay' })).toBeTruthy();
    });

    it('mounts inside the parent of the call site, not on document.body', () => {
        render(
            <div data-testid="window">
                <InlineDialog aria-label="Inside" />
            </div>
        );

        expect(screen.getByTestId('window').contains(screen.getByRole('dialog', { name: 'Inside' }))).toBe(true);
    });
});
