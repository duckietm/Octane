import { act, cleanup, render } from '@testing-library/react';
import { Activity } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { LayoutAvatarImageView } from './LayoutAvatarImageView';

const mocks = vi.hoisted(() => ({ createAvatarImage: vi.fn(), crop: vi.fn() }));

vi.mock('@octane/renderer', () => ({
    AvatarScaleType: { LARGE: 'h' },
    AvatarSetType: { FULL: 'full', HEAD: 'head' },
    GetAvatarRenderManager: () => ({ createAvatarImage: mocks.createAvatarImage })
}));

vi.mock('../Base', () => ({
    Base: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

vi.mock('./avatarImageCrop', () => ({
    cropAirMeMenuFaceImageUrl: mocks.crop,
    cropOpaqueBoundsImageUrl: mocks.crop,
    cropTransparentImageUrl: mocks.crop
}));

afterEach(() => {
    cleanup();
    vi.resetAllMocks();
});

it('keeps the loaded toolbar face when the placeholder crop finishes last', async () => {
    let finishPlaceholder: (url: string) => void;
    let finishFace: (url: string) => void;
    const placeholderCrop = new Promise<string>((resolve) => {
        finishPlaceholder = resolve;
    });
    const faceCrop = new Promise<string>((resolve) => {
        finishFace = resolve;
    });
    mocks.crop.mockReturnValueOnce(placeholderCrop).mockReturnValueOnce(faceCrop);
    const placeholder = {
        setDirection: vi.fn(),
        processAsImageUrl: () => 'placeholder',
        isPlaceholder: () => true,
        dispose: vi.fn()
    };
    const face = {
        setDirection: vi.fn(),
        processAsImageUrl: () => 'face',
        isPlaceholder: () => false,
        dispose: vi.fn()
    };
    mocks.createAvatarImage.mockReturnValueOnce(placeholder).mockReturnValueOnce(face);

    const { container } = render(<LayoutAvatarImageView figure="toolbar-loading-race" airMeMenu direction={3} />);
    expect(mocks.createAvatarImage).toHaveBeenCalledTimes(1);
    const listener = mocks.createAvatarImage.mock.calls[0][3];
    await act(async () => {
        listener.resetFigure('toolbar-loading-race');
    });
    await act(async () => {
        finishFace('loaded-face.png');
    });
    expect(container.querySelector('img')).toHaveAttribute('src', 'loaded-face.png');
    await act(async () => {
        finishPlaceholder('placeholder.png');
    });
    expect(container.querySelector('img')).toHaveAttribute('src', 'loaded-face.png');
    expect(placeholder.dispose).toHaveBeenCalledOnce();
    expect(face.dispose).toHaveBeenCalledOnce();
});

it('restarts a pending toolbar face when its effects are reactivated', async () => {
    mocks.crop.mockImplementation(async (url: string) => url);
    const placeholder = { setDirection: vi.fn(), processAsImageUrl: () => 'reactivation-placeholder.png', isPlaceholder: () => true, dispose: vi.fn() };
    const face = { setDirection: vi.fn(), processAsImageUrl: () => 'reactivation-face.png', isPlaceholder: () => false, dispose: vi.fn() };
    mocks.createAvatarImage.mockReturnValueOnce(placeholder).mockReturnValue(face);
    const view = (mode: 'visible' | 'hidden') => (
        <Activity mode={mode}>
            <LayoutAvatarImageView figure="reactivation-look" airMeMenu />
        </Activity>
    );
    const { container, rerender } = render(view('visible'));
    await act(async () => {});
    expect(container.querySelector('img')).toHaveAttribute('src', 'reactivation-placeholder.png');
    rerender(view('hidden'));
    rerender(view('visible'));
    await act(async () => {});
    expect(container.querySelector('img')).toHaveAttribute('src', 'reactivation-face.png');
});
