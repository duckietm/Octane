import { IHousekeepingList } from './IHousekeepingTypes';

export const HOUSEKEEPING_PERMISSIONS_LIST = 'hotel.permissions';

export interface HousekeepingMatrixRank {
    id: number;
    name: string;
    /** The rank policy lets the operator change this rank. */
    editable: boolean;
    /** The operator's own rank: changing it can lock them out. */
    own: boolean;
}

export interface HousekeepingMatrixRow {
    key: string;
    comment: string;
    /** 1 for on/off permissions; higher values are levels (e.g. 2 = only with room rights). */
    max: number;
    /** One value per rank, in the order of the ranks. */
    values: number[];
}

export interface HousekeepingPermissionMatrix {
    ranks: HousekeepingMatrixRank[];
    rows: HousekeepingMatrixRow[];
}

const RANK_COLUMN = /^rank:(\d+):([01]):([01]):(.*)$/;

/** Reads the hotel.permissions list; rank columns are "rank:<id>:<editable>:<own>:<name>". */
export const readHousekeepingPermissionMatrix = (list: IHousekeepingList): HousekeepingPermissionMatrix => {
    const rankColumns: { index: number; rank: HousekeepingMatrixRank }[] = [];

    list.columns.forEach((column, index) => {
        const match = RANK_COLUMN.exec(column);

        if (match) rankColumns.push({ index, rank: { id: Number(match[1]), editable: match[2] === '1', own: match[3] === '1', name: match[4] } });
    });

    const keyIndex = list.columns.indexOf('permission');
    const commentIndex = list.columns.indexOf('comment');
    const maxIndex = list.columns.indexOf('max');

    return {
        ranks: rankColumns.map((column) => column.rank),
        rows: list.rows.map((row) => ({
            key: row[keyIndex] ?? '',
            comment: row[commentIndex] ?? '',
            max: Math.max(1, Number(row[maxIndex]) || 1),
            values: rankColumns.map((column) => Number(row[column.index]) || 0)
        }))
    };
};

/** Permission rows matching a search on the key or the comment, and optionally only those that differ between ranks. */
export const filterHousekeepingPermissionRows = (rows: HousekeepingMatrixRow[], search: string, onlyMixed: boolean): HousekeepingMatrixRow[] => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
        if (query && !row.key.toLowerCase().includes(query) && !row.comment.toLowerCase().includes(query)) return false;
        if (onlyMixed && row.values.every((value) => value === row.values[0])) return false;

        return true;
    });
};
