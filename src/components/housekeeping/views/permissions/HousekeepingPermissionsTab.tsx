import { FC, useEffect, useMemo, useState } from 'react';
import { FaExclamationTriangle, FaKey, FaLock, FaSearch, FaSync } from 'react-icons/fa';
import {
    filterHousekeepingPermissionRows,
    HOUSEKEEPING_PERMISSIONS_LIST,
    HousekeepingApi,
    housekeepingFailureKey,
    HousekeepingMatrixRank,
    HousekeepingPermissionMatrix,
    LocalizeText,
    readHousekeepingPermissionMatrix
} from '../../../../api';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { HOUSEKEEPING_INPUT_CLASS, HousekeepingButton, HousekeepingEmptyState, HousekeepingPill, HousekeepingSection } from '../common/HousekeepingParts';

/**
 * Every permission against every rank. A cell saves on change and the server reloads the
 * permissions at once; ranks the rank policy keeps the operator from acting on are locked,
 * and a change to the operator's own rank asks first.
 */
export const HousekeepingPermissionsTab: FC = () => {
    const { isActionPending, setPermission } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const [matrix, setMatrix] = useState<HousekeepingPermissionMatrix | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [reload, setReload] = useState(0);
    const [search, setSearch] = useState('');
    const [onlyMixed, setOnlyMixed] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        setIsLoading(true);
        setError(null);

        HousekeepingApi.requestList(HOUSEKEEPING_PERMISSIONS_LIST, 0, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return;

                if (result.ok) setMatrix(readHousekeepingPermissionMatrix(result));
                setError(result.ok ? null : result.message || 'housekeeping.list.failed');
            })
            .catch((reason) => {
                if (!controller.signal.aborted) setError(housekeepingFailureKey(reason, 'housekeeping.list.failed'));
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false);
            });

        return () => controller.abort();
    }, [reload]);

    const rows = useMemo(() => (matrix ? filterHousekeepingPermissionRows(matrix.rows, search, onlyMixed) : []), [matrix, search, onlyMixed]);

    const writeCell = (key: string, rankIndex: number, value: number) =>
        setMatrix((previous) =>
            previous
                ? {
                      ...previous,
                      rows: previous.rows.map((row) =>
                          row.key === key ? { ...row, values: row.values.map((current, index) => (index === rankIndex ? value : current)) } : row
                      )
                  }
                : previous
        );

    const change = (key: string, rank: HousekeepingMatrixRank, rankIndex: number, previous: number, value: number) => {
        const save = async () => {
            writeCell(key, rankIndex, value);

            const result = await setPermission(key, rank.id, value);

            if (!result?.ok) writeCell(key, rankIndex, previous);
        };

        if (rank.own) {
            confirm(LocalizeText('housekeeping.permissions.own.confirm', ['permission', 'rank'], [key, rank.name]), save);

            return;
        }

        save();
    };

    return (
        <HousekeepingSection
            aside={
                <HousekeepingButton disabled={isLoading} gap={1} size="sm" variant="secondary" onClick={() => setReload((value) => value + 1)}>
                    <FaSync className={isLoading ? 'animate-spin' : ''} size={9} />
                    <span>{LocalizeText('housekeeping.history.refresh')}</span>
                </HousekeepingButton>
            }
            icon={<FaKey className="text-amber-600" size={9} />}
            title={LocalizeText('housekeeping.permissions.label')}
            tone="warning"
        >
            <div className="text-[10px] text-zinc-500">{LocalizeText('housekeeping.permissions.hint')}</div>
            <div className="flex items-center gap-1.5">
                <FaSearch className="shrink-0 text-zinc-400" size={10} />
                <input
                    className={HOUSEKEEPING_INPUT_CLASS}
                    placeholder={LocalizeText('housekeeping.permissions.search')}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                <label className="flex shrink-0 items-center gap-1 text-[10px] text-zinc-600">
                    <input checked={onlyMixed} type="checkbox" onChange={(event) => setOnlyMixed(event.target.checked)} />
                    {LocalizeText('housekeeping.permissions.only_mixed')}
                </label>
                {matrix && <HousekeepingPill>{rows.length}</HousekeepingPill>}
            </div>

            {error && <HousekeepingEmptyState>{LocalizeText(error)}</HousekeepingEmptyState>}
            {!error && !matrix && isLoading && <HousekeepingEmptyState>{LocalizeText('generic.loading')}</HousekeepingEmptyState>}
            {!error && matrix && rows.length === 0 && <HousekeepingEmptyState>{LocalizeText('housekeeping.permissions.empty')}</HousekeepingEmptyState>}

            {!error && matrix && rows.length > 0 && (
                <div className="max-h-[420px] overflow-auto rounded border border-zinc-200 bg-white">
                    <table className="w-full border-collapse text-[11px]">
                        <thead className="sticky top-0 z-[1] bg-zinc-100">
                            <tr>
                                <th className="px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                                    {LocalizeText('housekeeping.permissions.column.permission')}
                                </th>
                                {matrix.ranks.map((rank) => (
                                    <th
                                        key={rank.id}
                                        className={`px-1 py-1 text-center text-[10px] font-semibold ${rank.own ? 'text-amber-700' : 'text-zinc-600'}`}
                                        title={rank.editable ? rank.name : LocalizeText('housekeeping.permissions.locked', ['rank'], [rank.name])}
                                    >
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="max-w-[72px] truncate">{rank.name || `#${rank.id}`}</span>
                                            <span className="flex items-center gap-0.5 text-[9px] font-normal text-zinc-500">
                                                {!rank.editable && <FaLock size={7} />}
                                                {rank.own && <FaExclamationTriangle className="text-amber-600" size={7} />}#{rank.id}
                                            </span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.key} className="border-t border-zinc-100 hover:bg-sky-50/50">
                                    <td className="px-1.5 py-0.5" title={row.comment}>
                                        <div className="font-semibold text-zinc-800">{row.key}</div>
                                        {row.comment && <div className="max-w-[240px] truncate text-[10px] text-zinc-500">{row.comment}</div>}
                                    </td>
                                    {matrix.ranks.map((rank, rankIndex) => {
                                        const value = row.values[rankIndex] ?? 0;
                                        const disabled = !rank.editable || isActionPending;
                                        const label = `${row.key} · ${rank.name || `#${rank.id}`}`;

                                        return (
                                            <td key={rank.id} className={`px-1 py-0.5 text-center ${rank.own ? 'bg-amber-50/60' : ''}`}>
                                                {row.max <= 1 ? (
                                                    <input
                                                        aria-label={label}
                                                        checked={value > 0}
                                                        disabled={disabled}
                                                        type="checkbox"
                                                        onChange={(event) => change(row.key, rank, rankIndex, value, event.target.checked ? 1 : 0)}
                                                    />
                                                ) : (
                                                    <select
                                                        aria-label={label}
                                                        className="rounded border border-zinc-300 bg-white px-0.5 text-[11px] disabled:opacity-50"
                                                        disabled={disabled}
                                                        value={value}
                                                        onChange={(event) => change(row.key, rank, rankIndex, value, Number(event.target.value))}
                                                    >
                                                        {Array.from({ length: row.max + 1 }, (_, option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </HousekeepingSection>
    );
};
