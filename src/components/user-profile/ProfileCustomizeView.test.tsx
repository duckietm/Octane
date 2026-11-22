/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const sendProfileCustomization = vi.hoisted(() => vi.fn());
const removeProfileImage = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));

vi.mock('../../api', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    loadProfileCustomizationData: () =>
        Promise.resolve({ banners: [{ id: 1, image: 'reception/nl.png' }], cards: [0, 3], borders: [2], backgrounds: [0, 1], stands: [0], overlays: [0] }),
    resolveProfileBannerUrl: (image: string) => `https://assets/${image}`,
    profileImageUrl: (file: string) => `https://assets/profile-images/${file}`,
    removeProfileImage,
    uploadProfileImage: vi.fn(),
    sendProfileCustomization
}));

import { ProfileCustomizeView } from './ProfileCustomizeView';

const profile = { id: 9, backgroundId: 0, standId: 0, overlayId: 0, cardBackgroundId: 0, borderId: 0, bannerId: 0, accentId: 0 };

describe('ProfileCustomizeView', () => {
    afterEach(() => {
        cleanup();
        sendProfileCustomization.mockClear();
        removeProfileImage.mockClear();
    });

    it('removes the uploaded banner before a gallery banner replaces it', async () => {
        const withUpload = { ...profile, bannerImage: '9_banner_0123456789abcdef.jpg' };

        render(<ProfileCustomizeView userProfile={withUpload as never} onClose={() => undefined} />);

        fireEvent.click(await screen.findByRole('button', { name: 'Banner 1' }));

        await vi.waitFor(() => expect(sendProfileCustomization).toHaveBeenCalledWith(withUpload, { banner: 1 }));
        expect(removeProfileImage).toHaveBeenCalledWith('banner');
    });

    it('offers an upload button on the banner and background tabs', async () => {
        render(<ProfileCustomizeView userProfile={profile as never} onClose={() => undefined} />);

        expect(await screen.findByRole('button', { name: 'Upload a picture' })).toBeInTheDocument();
        fireEvent.click(screen.getByText('Background'));
        expect(screen.getByRole('button', { name: 'Upload a picture' })).toBeInTheDocument();
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
        fireEvent.click(await screen.findByRole('button', { name: 'Gold' }));

        expect(sendProfileCustomization).toHaveBeenCalledWith(profile, { accent: 4 });
    });
});

describe('ProfileCustomizeView picture tab', () => {
    afterEach(() => {
        cleanup();
        sendProfileCustomization.mockClear();
    });

    it('shows one part of the picture at a time', async () => {
        render(<ProfileCustomizeView userProfile={profile as never} onClose={() => undefined} />);

        fireEvent.click(screen.getByText('Picture'));
        await screen.findByRole('button', { name: 'Stand' });

        expect(document.querySelectorAll('.profile-preview')).toHaveLength(2);

        fireEvent.click(screen.getByRole('button', { name: 'Stand' }));

        expect(document.querySelectorAll('.profile-preview')).toHaveLength(1);
    });
});
