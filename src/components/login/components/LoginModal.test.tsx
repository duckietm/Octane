import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginModal } from './LoginModal';

afterEach(cleanup);

const renderModal = (onClose = vi.fn()) => {
    render(
        <LoginModal title="Create account" titleId="create-account-title" closeLabel="Close" onClose={onClose}>
            <button type="button">Continue</button>
        </LoginModal>
    );

    return { onClose, dialog: screen.getByRole('dialog', { name: 'Create account' }) };
};

describe('LoginModal', () => {
    it('closes when Escape is pressed', () => {
        const { onClose } = renderModal();

        fireEvent.keyDown(screen.getByRole('button', { name: 'Continue' }), { key: 'Escape' });

        expect(onClose).toHaveBeenCalledOnce();
    });

    it('closes when the overlay itself is clicked', () => {
        const { onClose, dialog } = renderModal();

        fireEvent.click(dialog.closest('.octane-login-modal')!);

        expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close when dialog content is clicked', () => {
        const { onClose } = renderModal();

        fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

        expect(onClose).not.toHaveBeenCalled();
    });
});
