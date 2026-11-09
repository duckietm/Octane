import { expect, it, vi } from 'vitest';
import { updateRoomTint } from './updateRoomTint';

it('attaches only a non-white tint, keeps other filters and avoids repeated assignments', () => {
    const tint = { red: 1, green: 1, blue: 1, enabled: true } as never;
    const other = {};
    let filters: unknown[] = [other];
    const set = vi.fn((value: unknown[]) => {
        filters = value;
    });
    const master = {
        get filters() {
            return filters;
        },
        set filters(value: unknown) {
            set(value as unknown[]);
        }
    };

    updateRoomTint(master, tint, 0xffffff);
    expect(set).not.toHaveBeenCalled();

    updateRoomTint(master, tint, 0x804020);
    expect(filters).toEqual([other, tint]);
    expect((tint as { red: number }).red).toBe(128 / 255);

    updateRoomTint(master, tint, 0x102030);
    expect(set).toHaveBeenCalledTimes(1);

    updateRoomTint(master, tint, 0xffffff);
    expect(filters).toEqual([other]);
    expect(set).toHaveBeenCalledTimes(2);
});
