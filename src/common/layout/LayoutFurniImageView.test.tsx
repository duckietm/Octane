import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutFurniImageView } from './LayoutFurniImageView';

const { generateImage, getImage } = vi.hoisted(() => ({
    generateImage: vi.fn(),
    getImage: vi.fn().mockResolvedValue({ height: 10, src: 'data:x', width: 10 } as HTMLImageElement)
}));

vi.mock('@octane/renderer', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@octane/renderer')>();

    return {
        ...actual,
        GetRoomEngine: () => ({
            getFurnitureFloorImage: () => ({ data: {}, getImage }),
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
});
