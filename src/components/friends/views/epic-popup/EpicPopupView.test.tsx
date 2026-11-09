/* @vitest-environment jsdom */

import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveEpicPopupImage, useEpicPopup } from '../../../../hooks/friends/useEpicPopup';
import { EpicPopupView } from './EpicPopupView';

vi.mock('../../../../hooks/friends/useEpicPopup', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../../hooks/friends/useEpicPopup')>();

    return { ...actual, useEpicPopup: vi.fn() };
});

describe('AIR HabboEpicPopupView', () => {
    afterEach(() => {
        cleanup();
        vi.mocked(useEpicPopup).mockReset();
    });

    it('shows the image with the close button, and closes', () => {
        const close = vi.fn();

        vi.mocked(useEpicPopup).mockReturnValue({ imageUrl: 'https://images.example/notifications/summer.png', close });

        const { getByTestId } = render(<EpicPopupView />);

        expect(getByTestId('epic-popup').querySelector('img')).toHaveAttribute('src', 'https://images.example/notifications/summer.png');

        fireEvent.click(document.querySelector<HTMLButtonElement>('.octane-epic-popup-close'));
        expect(close).toHaveBeenCalledTimes(1);
    });

    it('renders nothing without a popup', () => {
        vi.mocked(useEpicPopup).mockReturnValue({ imageUrl: null, close: vi.fn() });

        const { container } = render(<EpicPopupView />);

        expect(container).toBeEmptyDOMElement();
    });

    it('drops an image whose configuration keys cannot be resolved', () => {
        expect(resolveEpicPopupImage('https://images.example/a.png')).toBe('https://images.example/a.png');
        expect(resolveEpicPopupImage('${image.library.url}notifications/a.png')).toBe('');
        expect(resolveEpicPopupImage('  ')).toBe('');
    });
});
