import { GetSessionDataManager, IRoomSession } from '@octane/renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanOpenFurniChooser } from './CanOpenFurniChooser';

const withSessionData = (securityLevel: number, isAmbassador = false, permissions: [string, number][] = []) =>
    vi.mocked(GetSessionDataManager).mockReturnValue({
        hasSecurity: (level: number) => securityLevel >= level,
        getPermissionsSnapshot: () => new Map(permissions),
        isAmbassador
    } as unknown as ReturnType<typeof GetSessionDataManager>);

const session = (controllerLevel: number) => ({ controllerLevel }) as IRoomSession;

describe('CanOpenFurniChooser (AIR :furni)', () =>
{
    afterEach(() => vi.mocked(GetSessionDataManager).mockReset());

    it('stays closed for a plain visitor without rights', () =>
    {
        withSessionData(1);

        expect(CanOpenFurniChooser(session(0))).toBe(false);
        expect(CanOpenFurniChooser(null)).toBe(false);
    });

    it('opens for controller level 1 and up (rights holders, owner)', () =>
    {
        withSessionData(0, false, [ [ 'acc_supporttool', 1 ] ]);

        expect(CanOpenFurniChooser(session(1))).toBe(true);
        expect(CanOpenFurniChooser(session(4))).toBe(true);
    });

    it('opens for a rank with acc_furni_chooser without room rights', () =>
    {
        withSessionData(0, false, [ [ 'acc_furni_chooser', 1 ] ]);

        expect(CanOpenFurniChooser(session(0))).toBe(true);
    });

    it('follows the permission, not the security level, when the server sends keys', () =>
    {
        withSessionData(7, false, [ [ 'acc_supporttool', 1 ] ]);

        expect(CanOpenFurniChooser(session(0))).toBe(false);
    });

    it('keeps AIR\'s security level 2 when the server sends no keys', () =>
    {
        withSessionData(2);

        expect(CanOpenFurniChooser(session(0))).toBe(true);
    });

    it('opens for ambassadors without room rights', () =>
    {
        withSessionData(0, true, [ [ 'acc_supporttool', 1 ] ]);

        expect(CanOpenFurniChooser(session(0))).toBe(true);
    });

    it('stays closed without session data and rights', () =>
    {
        vi.mocked(GetSessionDataManager).mockReturnValue(null);

        expect(CanOpenFurniChooser(session(0))).toBe(false);
    });
});
