/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';
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

        fireEvent.click(screen.getByText('Theme'));
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

describe('ProfileCustomizeView pose tab', () => {
    afterEach(() => {
        cleanup();
        sendProfileCustomization.mockClear();
    });

    const openPose = async (userProfile: object = profile) => {
        render(<ProfileCustomizeView userProfile={userProfile as never} onClose={() => undefined} />);
        fireEvent.click(screen.getByText('Pose'));

        return screen.findByTestId('profile-pose-preview');
    };

    const avatarOf = (preview: HTMLElement) => preview.querySelector<HTMLElement>('.avatar-image');

    it('comes right after the picture tab', () => {
        render(<ProfileCustomizeView userProfile={profile as never} onClose={() => undefined} />);

        const tabs = ['Banner', 'Background', 'Picture', 'Pose', 'Border', 'Theme'].map((name) => screen.getByText(name));

        tabs.reduce((previous, tab) => {
            expect(previous.compareDocumentPosition(tab) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

            return tab;
        });
    });

    it('shows the whole picture with the saved pose, today\'s look by default', async () => {
        const preview = await openPose({ ...profile, figure: 'hd-180-1.ch-210-66', backgroundId: 4, standId: 5, overlayId: 6 });

        expect(preview.querySelector('.profile-background.background-4')).not.toBeNull();
        expect(preview.querySelector('.profile-stand.stand-5')).not.toBeNull();
        expect(preview.querySelector('.profile-overlay.overlay-6')).not.toBeNull();
        expect(avatarOf(preview)?.style.translate ?? '').toBe('');
        expect(screen.getByTestId('profile-pose-direction')).toHaveTextContent('2');
        expect(screen.getByRole('button', { name: 'Save pose' })).toBeDisabled();
    });

    it('turns the avatar both ways round the eight directions', async () => {
        await openPose({ ...profile, avatarDirection: 7 });

        fireEvent.click(screen.getByRole('button', { name: 'Turn left' }));
        expect(screen.getByTestId('profile-pose-direction')).toHaveTextContent('0');

        fireEvent.click(screen.getByRole('button', { name: 'Turn right' }));
        fireEvent.click(screen.getByRole('button', { name: 'Turn right' }));
        expect(screen.getByTestId('profile-pose-direction')).toHaveTextContent('6');
    });

    it('nudges the avatar live, stops at the edge of the box and centres it again', async () => {
        const preview = await openPose({ ...profile, avatarOffsetX: 15 });

        expect(avatarOf(preview)?.style.translate).toBe('15px 0px');

        fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
        expect(screen.getByTestId('profile-pose-x')).toHaveTextContent('16');
        expect(screen.getByRole('button', { name: 'Move right' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Move up' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move up' }));
        expect(avatarOf(preview)?.style.translate).toBe('16px -2px');

        fireEvent.click(screen.getByRole('button', { name: 'Centre' }));
        expect(avatarOf(preview)?.style.translate ?? '').toBe('');
        expect(screen.getByTestId('profile-pose-y')).toHaveTextContent('0');
    });

    it('saves the pose through the customisation message', async () => {
        await openPose();

        fireEvent.click(screen.getByRole('button', { name: 'Turn left' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move left' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move down' }));
        fireEvent.click(screen.getByRole('button', { name: 'Save pose' }));

        expect(sendProfileCustomization).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), { pose: { direction: 3, offsetX: -1, offsetY: 1 } });
    });

    it('draws the picker previews with the saved pose', async () => {
        render(<ProfileCustomizeView userProfile={{ ...profile, avatarDirection: 4, avatarOffsetX: -5, avatarOffsetY: 3 } as never} onClose={() => undefined} />);

        fireEvent.click(screen.getByText('Picture'));
        await screen.findByRole('button', { name: 'Stand' });

        const previews = document.querySelectorAll<HTMLElement>('.profile-preview .avatar-image');

        expect(previews.length).toBeGreaterThan(0);
        previews.forEach((avatar) => expect(avatar.style.translate).toBe('-5px 3px'));
    });
});

describe('ProfileCustomizeView on a phone', () => {
    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
        sendProfileCustomization.mockClear();
    });

    it('is a sheet in the phone look whose pills are the tabs, the pose tab among them', async () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        render(<ProfileCustomizeView userProfile={{ ...profile, figure: 'hd-180-1' } as never} onClose={() => undefined} />);

        expect(document.querySelector('.octane-handheld-sheet.octane-handheld-customize')).not.toBeNull();
        expect(document.querySelector('.octane-card-shell')).toBeNull();
        expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Banner', 'Background', 'Picture', 'Pose', 'Border', 'Theme']);

        fireEvent.click(await screen.findByRole('button', { name: 'Banner 1' }));
        expect(sendProfileCustomization).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }), { banner: 1 });

        fireEvent.click(screen.getByRole('tab', { name: 'Pose' }));
        expect(screen.getByTestId('profile-pose-preview')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Pose' })).toHaveAttribute('aria-selected', 'true');
    });
});
