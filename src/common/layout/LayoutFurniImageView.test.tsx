import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutFurniImageView } from './LayoutFurniImageView';

const { floorImage, generateImage, getImage } = vi.hoisted(() => ({
    floorImage: vi.fn(),
    generateImage: vi.fn(),
    getImage: vi.fn().mockResolvedValue({ height: 10, src: 'data:x', width: 10 } as HTMLImageElement)
}));

vi.mock('@octane/renderer', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@octane/renderer')>();

    return {
        ...actual,
        GetRoomEngine: () => ({
            getFurnitureFloorImage: (...args: unknown[]) => {
                floorImage(...args);

                return { data: {}, getImage };
            },
            getFurnitureWallImage: () => ({ data: {}, getImage })
        }),
        TextureUtils: { ...actual.TextureUtils, generateImage }
    };
});

describe('LayoutFurniImageView', () => {
    it('renders the image from the result\'s shared extraction instead of regenerating it from the texture', async () => {
        const { container } = render(<LayoutFurniImageView productClassId={1} productType="s" />);

        await waitFor(() => expect((container.firstElementChild as HTMLElement).style.backgroundImage).toContain('data:x'));

        expect(getImage).toHaveBeenCalled();
        expect(generateImage).not.toHaveBeenCalled();
    });

    it('draws the furni with the object data it is given, as the room would (a group furni in its group colours)', async () => {
        const objectData = { getLegacyString: () => '0' } as any;

        floorImage.mockClear();
        render(<LayoutFurniImageView objectData={objectData} productClassId={7} productType="s" />);

        await waitFor(() => expect(floorImage).toHaveBeenCalled());

        // The last argument of getFurnitureFloorImage is the furni's own data.
        expect(floorImage.mock.calls[0][0]).toBe(7);
        expect(floorImage.mock.calls[0][8]).toBe(objectData);
    });

    it('draws a furni without object data as before', async () => {
        floorImage.mockClear();
        render(<LayoutFurniImageView productClassId={7} productType="s" />);

        await waitFor(() => expect(floorImage).toHaveBeenCalled());

        expect(floorImage.mock.calls[0][8]).toBeNull();
    });
});
