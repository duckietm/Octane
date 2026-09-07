import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LayoutPetImageView } from './LayoutPetImageView';

interface PendingImage {
    resolve: (image: HTMLImageElement) => void;
}

const pendingImages: PendingImage[] = [];

vi.mock('@octane/renderer', () => ({
    GetRoomEngine: () => ({
        getRoomObjectPetImage: () => {
            let resolve: PendingImage['resolve'];
            const image = new Promise<HTMLImageElement>((complete) => {
                resolve = complete;
            });

            pendingImages.push({ resolve });

            return { getImage: () => image };
        }
    }),
    PetFigureData: class {},
    TextureUtils: { generateImageUrl: vi.fn() },
    Vector3d: class {}
}));

const createImage = (src: string) => ({ height: 64, src, width: 64 }) as HTMLImageElement;

beforeEach(() => {
    pendingImages.length = 0;
});

describe('LayoutPetImageView', () => {
    it('ignores an older image request that completes after the selected pet changes', async () => {
        const { container, rerender } = render(<LayoutPetImageView paletteId={1} typeId={1} />);

        rerender(<LayoutPetImageView paletteId={2} typeId={2} />);
        expect(pendingImages).toHaveLength(2);

        await act(async () => pendingImages[1].resolve(createImage('new-pet.png')));
        await waitFor(() => expect((container.firstElementChild as HTMLElement).style.backgroundImage).toContain('new-pet.png'));

        await act(async () => pendingImages[0].resolve(createImage('old-pet.png')));
        expect((container.firstElementChild as HTMLElement).style.backgroundImage).toContain('new-pet.png');
    });
});
