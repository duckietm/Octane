/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../hooks', () => ({
    useNavigatorData: () => ({ categories: [{ id: 1, name: 'General', visible: true }] }),
    useNavigatorUiStore: () => undefined,
    useUserDataSnapshot: () => ({ clubLevel: 0, securityLevel: 1 }),
    useUserPermissions: () => new Map()
}));

import { NavigatorRoomCreatorView } from './NavigatorRoomCreatorView';

describe('NavigatorRoomCreatorView drop menus', () => {
    afterEach(() => cleanup());

    it('renders its drop menus as Base UI selects mounted inside their own root', () => {
        const { container } = render(<NavigatorRoomCreatorView />);
        const menus = container.ownerDocument.querySelectorAll('.octane-room-creator-air__dropmenu');

        expect(menus.length).toBeGreaterThan(0);

        const trigger = menus[0].querySelector<HTMLElement>('[role="combobox"]');

        expect(trigger).not.toBeNull();

        fireEvent.click(trigger as HTMLElement);

        expect(menus[0].querySelector('.octane-room-creator-air__dropmenu-list')).not.toBeNull();
        expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
    });
});
