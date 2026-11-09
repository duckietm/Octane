import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RefreshRoomThumbnail } from '../../api';
import { LayoutRoomThumbnailView } from './LayoutRoomThumbnailView';

vi.mock('../../api', async () => {
    const actual = await vi.importActual<typeof import('../../api')>('../../api');

    return {
        ...actual,
        GetConfigurationValue: (key: string) => {
            if (key === 'image.library.url') return 'https://library.test';
            if (key === 'thumbnails.url') return 'https://thumbnails.test/%thumbnail%.png';
            return '';
        }
    };
});

afterEach(() => {
    cleanup();
});

describe('room thumbnail cache refresh', () => {
    it('shows the newly captured room image without reusing the stale official URL', () => {
        const { container } = render(<LayoutRoomThumbnailView roomId={42} customUrl="/official.png" />);
        expect(container.querySelector('img')).toHaveAttribute('src', 'https://library.test/official.png');

        act(() => RefreshRoomThumbnail(42, 1234));

        expect(container.querySelector('img')).toHaveAttribute('src', 'https://thumbnails.test/42.png?v=1234');
    });
});
