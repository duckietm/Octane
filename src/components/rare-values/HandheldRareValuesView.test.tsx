import * as Renderer from '@octane/renderer';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../state/handheldStore';

const names = ['Throne', 'Holo Dragon', 'Golden Duck'];
const data = vi.hoisted(() => ({ values: new Map<number, { points: number; pointsType: number }>() }));

vi.mock('@octane/renderer', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    GetConfiguration: () => ({ getValue: (_key: string, fallback: unknown) => fallback ?? '' }),
    GetLocalizationManager: () => ({ getValue: (key: string) => key, getValueWithParameters: (key: string) => key })
}));

vi.mock('../../hooks', async (importOriginal) => ({
    ...(await importOriginal<Record<string, unknown>>()),
    useRareValues: () => ({ values: data.values, loaded: true })
}));

data.values = new Map(names.map((_, index) => [index + 1, { points: (3 - index) * 100, pointsType: -1 }]));

const { RareValuesView } = await import('./RareValuesView');

const open = () => {
    render(<RareValuesView />);

    const calls = (Renderer.AddLinkEventTracker as unknown as { mock: { calls: { eventUrlPrefix: string; linkReceived: (url: string) => void }[][] } }).mock
        .calls;

    act(() =>
        [...calls]
            .reverse()
            .find(([value]) => value?.eventUrlPrefix === 'rare-values/')?.[0]
            .linkReceived('rare-values/show')
    );
};

describe('rare values on a phone', () => {
    beforeAll(() => {
        (Renderer.GetSessionDataManager as unknown as { mockImplementation: (fn: () => unknown) => void }).mockImplementation(() => ({
            getFloorItemData: (id: number) => ({ name: names[id - 1], className: `rare_${id}` }),
            getWallItemData: () => null
        }));
        (Renderer.GetRoomEngine as unknown as { mockImplementation: (fn: () => unknown) => void }).mockImplementation(() => ({
            getFurnitureFloorIconUrl: () => ''
        }));
    });

    afterAll(() => {
        (Renderer.GetSessionDataManager as unknown as { mockReset: () => void }).mockReset();
        (Renderer.GetRoomEngine as unknown as { mockReset: () => void }).mockReset();
    });

    afterEach(() => {
        cleanup();
        act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
    });

    it('lists the rares as cards, highest value first, and filters them with the search', () => {
        act(() => useHandheldStore.setState({ layout: { active: true, orientation: 'portrait' } }));
        open();

        const list = screen.getByTestId('handheld-rare-values');

        expect(
            within(list)
                .getAllByRole('listitem')
                .map((item) => item.textContent)
        ).toEqual([expect.stringContaining('Throne'), expect.stringContaining('Holo Dragon'), expect.stringContaining('Golden Duck')]);
        fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'duck' } });
        expect(within(list).getAllByRole('listitem')).toHaveLength(1);
        expect(within(list).getByText('Golden Duck')).toBeInTheDocument();
    });

    it('keeps the desktop window when not on a phone', () => {
        open();

        expect(screen.queryByTestId('handheld-rare-values')).toBeNull();
        expect(screen.getByText('Throne')).toBeInTheDocument();
    });
});
