/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FirstLoginSetupView } from './FirstLoginSetupView';

const setup = vi.hoisted(() => ({
    isVisible: true,
    templates: [{ templateId: 3, title: 'Loft', description: 'A cosy loft', thumbnail: '' }],
    dismiss: vi.fn(),
    finish: vi.fn()
}));
const createLinkEvent = vi.hoisted(() => vi.fn());

vi.mock('../../hooks/session/useFirstLoginSetup', () => ({ useFirstLoginSetup: () => setup }));
vi.mock('../../hooks/session/useSessionSnapshots', () => ({ useUserDataSnapshot: () => ({ figure: 'hd-180-1' }) }));
vi.mock('@octane/renderer', async (importOriginal) => ({ ...(await importOriginal<Record<string, unknown>>()), CreateLinkEvent: createLinkEvent }));
vi.mock('../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutAvatarImageView: (props: { figure: string }) => <i data-testid="avatar" data-figure={props.figure} />
}));

describe('FirstLoginSetupView', () => {
    beforeEach(() => {
        setup.isVisible = true;
        setup.finish.mockClear();
        setup.dismiss.mockClear();
        createLinkEvent.mockClear();
    });

    afterEach(cleanup);

    it('shows nothing until the server offers the setup', () => {
        setup.isVisible = false;

        const { container } = render(<FirstLoginSetupView />);

        expect(container).toBeEmptyDOMElement();
    });

    it('shows the look and opens the avatar editor', () => {
        render(<FirstLoginSetupView />);

        expect(screen.getByTestId('avatar')).toHaveAttribute('data-figure', 'hd-180-1');

        fireEvent.click(screen.getByRole('button', { name: 'Change my look' }));

        expect(createLinkEvent).toHaveBeenCalledWith('avatar-editor/show');
        expect(setup.finish).not.toHaveBeenCalled();
    });

    it('answers with no room unless one is chosen', () => {
        render(<FirstLoginSetupView />);

        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        expect(setup.finish).toHaveBeenCalledWith(null);
    });

    it('answers with the chosen starter room', () => {
        render(<FirstLoginSetupView />);

        fireEvent.click(screen.getByText('Loft'));
        fireEvent.click(screen.getByRole('button', { name: 'Done' }));

        expect(setup.finish).toHaveBeenCalledWith(3);
    });
});
