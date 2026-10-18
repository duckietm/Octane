import { GetRoomEngine, IRoomSession } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanOpenUserChooser } from './CanOpenUserChooser';

const withChooserDisabled = (disabled: boolean) =>
    vi.mocked(GetRoomEngine).mockReturnValue({ activeRoomHasChooserDisabled: disabled } as unknown as ReturnType<typeof GetRoomEngine>);

const session = (controllerLevel: number) => ({ controllerLevel }) as IRoomSession;

describe('CanOpenUserChooser (AIR :chooser disabler)', () =>
{
    afterEach(() => vi.mocked(GetRoomEngine).mockReset());

    it('opens for everyone while the room allows the chooser', () =>
    {
        withChooserDisabled(false);

        expect(CanOpenUserChooser(session(0))).toBe(true);
        expect(CanOpenUserChooser(null)).toBe(true);
    });

    it('stays closed for visitors without rights while the room disables it', () =>
    {
        withChooserDisabled(true);

        expect(CanOpenUserChooser(session(0))).toBe(false);
        expect(CanOpenUserChooser(null)).toBe(false);
    });

    it('still opens for controller level 1 and up while the room disables it', () =>
    {
        withChooserDisabled(true);

        expect(CanOpenUserChooser(session(1))).toBe(true);
        expect(CanOpenUserChooser(session(4))).toBe(true);
    });
});
