/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FurnitureGiftOpeningView } from './FurnitureGiftOpeningView';

const present = vi.hoisted(() => ({ objectId: 5, classId: -1, text: 'hi', isOwnerOfFurniture: true, senderName: 'dennis', senderFigure: '', trustedSender: false, placedItemId: -1, openPresent: vi.fn(), onClose: vi.fn() }));

vi.mock('../../../../hooks', () => ({
    useFurniturePresentWidget: () => present,
    useInventoryFurni: () => ({ groupItems: [] }),
    useCatalogUiState: () => ({ setGiftReceiver: vi.fn() })
}));
vi.mock('../../../../common', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    LayoutGiftTagView: () => <i data-testid="gift-card" />
}));

describe('gift card banner (AIR packagecard_new warning)', () => {
    afterEach(cleanup);

    it('warns about links in the message for a gift from a player', () => {
        present.trustedSender = false;

        render(<FurnitureGiftOpeningView />);

        expect(document.querySelector('.octane-gift-banner.is-untrusted')).not.toBeNull();
        expect(document.querySelector('.octane-gift-banner__icon')).not.toBeNull();
        expect(screen.getByText(/NEVER visit websites/)).toBeInTheDocument();
    });

    it('says a staff gift is from staff, without the warning', () => {
        present.trustedSender = true;

        render(<FurnitureGiftOpeningView />);

        expect(document.querySelector('.octane-gift-banner.is-trusted')).not.toBeNull();
        expect(document.querySelector('.octane-gift-banner__icon')).toBeNull();
        expect(screen.getByText(/sent to you by a staff member/)).toBeInTheDocument();
        expect(screen.queryByText(/NEVER visit websites/)).toBeNull();
    });

    it('shows no banner once the gift is opened', () => {
        present.placedItemId = 9;

        render(<FurnitureGiftOpeningView />);

        expect(document.querySelector('.octane-gift-banner')).toBeNull();
        present.placedItemId = -1;
    });
});
