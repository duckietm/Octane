/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sendProfileCustomization = vi.hoisted(() => vi.fn());

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    loadProfileCustomizationData: () =>
        Promise.resolve({ banners: [{ id: 1, image: 'reception/nl.png' }], cards: [0, 3], borders: [2] }),
    resolveProfileBannerUrl: (image: string) => `https://assets/${image}`,
    sendProfileCustomization
}));

import { ProfileCustomizeView } from './ProfileCustomizeView';

const profile = { id: 9, backgroundId: 0, standId: 0, overlayId: 0, cardBackgroundId: 0, borderId: 0, bannerId: 0, accentId: 0 };

describe('ProfileCustomizeView', () => {
    afterEach(() => {
        cleanup();
        sendProfileCustomization.mockClear();
    });

    it('saves the banner picked from the gallery', async () => {
        render(<ProfileCustomizeView userProfile={profile as never} onClose={() => undefined} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Banner 1' }));

        expect(sendProfileCustomization).toHaveBeenCalledWith(profile, { banner: 1 });
    });

    it('does not send the choice that is already saved', async () => {
        render(<ProfileCustomizeView userProfile={profile as never} onClose={() => undefined} />);

        fireEvent.click(await screen.findByRole('button', { name: 'None' }));

        expect(sendProfileCustomization).not.toHaveBeenCalled();
    });

    it('offers the accent palette on its own tab', async () => {
        render(<ProfileCustomizeView userProfile={profile as never} onClose={() => undefined} />);

        fireEvent.click(screen.getByText('Colour'));
        fireEvent.click(await screen.findByRole('button', { name: 'Colour 4' }));

        expect(sendProfileCustomization).toHaveBeenCalledWith(profile, { accent: 4 });
    });
});
