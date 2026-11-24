import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ widget: {} as Record<string, unknown> }));

vi.mock('../../../../hooks', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../../../hooks')>()),
    useFurnitureEcotronBoxWidget: () => state.widget
}));

import { FurnitureEcotronBoxView } from './FurnitureEcotronBoxView';

const widget = (overrides: Record<string, unknown>) => ({
    objectId: 5,
    card: 'ecotronbox_card',
    date: '',
    prizeName: null,
    prizeImageUrl: null,
    prizeChatStyleId: 0,
    canOpen: false,
    open: () => undefined,
    onClose: () => undefined,
    ...overrides
});

describe('Furni-Matic box card', () => {
    afterEach(cleanup);

    it('shows a chat style prize as its bubble with its name', () => {
        state.widget = widget({ prizeName: 'Storm bubble', prizeChatStyleId: 7 });

        render(<FurnitureEcotronBoxView />);
        const container = document.body;

        expect(container.querySelector('.octane-ecotronbox-preview .chat-bubble.bubble-7')).not.toBeNull();
        expect(container.querySelector('.octane-ecotronbox-preview img')).toBeNull();
        expect(container.querySelector('.octane-ecotronbox-msg')?.textContent).toBe('Storm bubble');
    });

    it('shows a furni prize as its icon, without a bubble', () => {
        state.widget = widget({ prizeName: 'Chair', prizeImageUrl: 'chair.png' });

        render(<FurnitureEcotronBoxView />);
        const container = document.body;

        expect(container.querySelector('.octane-ecotronbox-preview img')).toHaveAttribute('src', 'chair.png');
        expect(container.querySelector('.octane-ecotronbox-preview .chat-bubble')).toBeNull();
    });
});
