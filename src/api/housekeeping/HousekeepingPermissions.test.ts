import { describe, expect, it } from 'vitest';
import { filterHousekeepingPermissionRows, readHousekeepingPermissionMatrix } from './HousekeepingPermissions';

const list = {
    listKey: 'hotel.permissions',
    targetId: 0,
    ok: true,
    message: '',
    columns: ['permission', 'comment', 'max', 'rank:1:1:0:User', 'rank:6:1:0:Mod: senior', 'rank:7:1:1:Admin'],
    rows: [
        ['acc_housekeeping', 'Allow housekeeping', '1', '0', '0', '1'],
        ['cmd_about', 'About command', '1', '1', '1', '1'],
        ['acc_placefurni', 'Place furni', '2', '2', '1', '1']
    ]
};

describe('readHousekeepingPermissionMatrix', () => {
    it('reads the ranks from the column names, keeping a colon inside the name', () => {
        expect(readHousekeepingPermissionMatrix(list).ranks).toEqual([
            { id: 1, name: 'User', editable: true, own: false },
            { id: 6, name: 'Mod: senior', editable: true, own: false },
            { id: 7, name: 'Admin', editable: true, own: true }
        ]);
    });

    it('reads one value per rank and the max of each permission', () => {
        const rows = readHousekeepingPermissionMatrix(list).rows;

        expect(rows[0]).toEqual({ key: 'acc_housekeeping', comment: 'Allow housekeeping', max: 1, values: [0, 0, 1] });
        expect(rows[2].max).toBe(2);
    });
});

describe('filterHousekeepingPermissionRows', () => {
    const rows = readHousekeepingPermissionMatrix(list).rows;

    it('searches the key and the comment', () => {
        expect(filterHousekeepingPermissionRows(rows, 'furni', false).map((row) => row.key)).toEqual(['acc_placefurni']);
        expect(filterHousekeepingPermissionRows(rows, 'ABOUT', false).map((row) => row.key)).toEqual(['cmd_about']);
    });

    it('can keep only the permissions that differ between ranks', () => {
        expect(filterHousekeepingPermissionRows(rows, '', true).map((row) => row.key)).toEqual(['acc_housekeeping', 'acc_placefurni']);
    });
});
