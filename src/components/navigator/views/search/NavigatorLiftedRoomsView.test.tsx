import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavigatorLiftedRoomsView } from './NavigatorLiftedRoomsView';

const tryVisitRoom = vi.fn();

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../api')>('../../../../api');

    return {
        ...actual,
        GetConfigurationValue: (key: string, fallback?: unknown) => (key === 'image.library.url' ? 'https://img.test/c_images/' : fallback),
        TryVisitRoom: (roomId: number) => tryVisitRoom(roomId)
    };
});

afterEach(() => {
    cleanup();
    tryVisitRoom.mockReset();
});

describe('NavigatorLiftedRoomsView', () => {
    it('renders nothing without lifted rooms', () => {
        const { container } = render(<NavigatorLiftedRoomsView rooms={[]} />);

        expect(container.firstChild).toBeNull();
    });

    it('shows each room with its teaser and caption and goes to the room on click', () => {
        const { container } = render(
            <NavigatorLiftedRoomsView
                rooms={[
                    { roomId: 12, areaId: 1, image: 'officialrooms_hq/lobby.png', caption: 'Welcome Lobby' },
                    { roomId: 40, areaId: 0, image: '', caption: '' }
                ]}
            />
        );

        const images = Array.from(container.querySelectorAll('img')).map((image) => image.getAttribute('src'));

        expect(images).toEqual(['https://img.test/c_images/officialrooms_hq/lobby.png', 'https://img.test/c_images/officialrooms_hq/nav_teaser_wl.png']);
        expect(screen.getByText('Welcome Lobby')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Welcome Lobby' }));

        expect(tryVisitRoom).toHaveBeenCalledWith(12);
    });
});
