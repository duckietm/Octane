import { FC, useEffect, useMemo, useState } from 'react';
import { FaFilter, FaPlus, FaSearch, FaSync, FaTrash } from 'react-icons/fa';
import { HOUSEKEEPING_WORDFILTER_REPLACEMENT_MAX, HousekeepingApi, housekeepingFailureKey, IHousekeepingList, LocalizeText } from '../../../../api';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';
import { HOUSEKEEPING_INPUT_CLASS, HousekeepingButton, HousekeepingEmptyState, HousekeepingPill, HousekeepingSection } from '../common/HousekeepingParts';

const WORDFILTER_LIST = 'hotel.wordfilter';

/** The filtered words with their replacement: search, add (or change a replacement) and remove. */
export const HousekeepingWordFilterView: FC = () => {
    const { isActionPending, addFilterWord, removeFilterWord } = useHousekeeping();
    const confirm = useHousekeepingConfirm();
    const [list, setList] = useState<IHousekeepingList | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [reload, setReload] = useState(0);
    const [search, setSearch] = useState('');
    const [word, setWord] = useState('');
    const [replacement, setReplacement] = useState('');

    useEffect(() => {
        const controller = new AbortController();

        setIsLoading(true);
        setError(null);

        HousekeepingApi.requestList(WORDFILTER_LIST, 0, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return;

                setList(result);
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

    const column = (name: string) => list?.columns.indexOf(name) ?? -1;
    const cell = (row: string[], name: string) => {
        const index = column(name);

        return index >= 0 ? row[index] : '';
    };

    const rows = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!list) return [];
        if (!query) return list.rows;

        const wordIndex = list.columns.indexOf('word');
        const replacementIndex = list.columns.indexOf('replacement');

        return list.rows.filter((row) => row[wordIndex]?.toLowerCase().includes(query) || row[replacementIndex]?.toLowerCase().includes(query));
    }, [list, search]);

    const trimmedWord = word.trim();
    const trimmedReplacement = replacement.trim();

    const add = async () => {
        const result = await addFilterWord(trimmedWord, trimmedReplacement);

        if (!result?.ok) return;

        setWord('');
        setReplacement('');
        setReload((value) => value + 1);
    };

    const remove = (entry: string) =>
        confirm(LocalizeText('housekeeping.hotel.wordfilter.remove.confirm', ['word'], [entry]), async () => {
            const result = await removeFilterWord(entry);

            if (result?.ok) setReload((value) => value + 1);
        });

    return (
        <HousekeepingSection
            aside={
                <HousekeepingButton disabled={isLoading} gap={1} size="sm" variant="secondary" onClick={() => setReload((value) => value + 1)}>
                    <FaSync className={isLoading ? 'animate-spin' : ''} size={9} />
                    <span>{LocalizeText('housekeeping.history.refresh')}</span>
                </HousekeepingButton>
            }
            icon={<FaFilter className="text-orange-600" size={9} />}
            title={LocalizeText('housekeeping.hotel.wordfilter.label')}
            tone="warning"
        >
            <div className="flex items-center gap-1.5">
                <input
                    className={`${HOUSEKEEPING_INPUT_CLASS} grow`}
                    placeholder={LocalizeText('housekeeping.hotel.wordfilter.word')}
                    value={word}
                    onChange={(event) => setWord(event.target.value)}
                />
                <input
                    className={`${HOUSEKEEPING_INPUT_CLASS} !w-32 shrink-0`}
                    maxLength={HOUSEKEEPING_WORDFILTER_REPLACEMENT_MAX}
                    placeholder={LocalizeText('housekeeping.hotel.wordfilter.replacement')}
                    value={replacement}
                    onChange={(event) => setReplacement(event.target.value)}
                />
                <HousekeepingButton disabled={isActionPending || !trimmedWord} gap={1} variant="success" onClick={add}>
                    <FaPlus size={9} />
                    <span>{LocalizeText('housekeeping.hotel.wordfilter.add')}</span>
                </HousekeepingButton>
            </div>
            <div className="text-[10px] text-zinc-500">{LocalizeText('housekeeping.hotel.wordfilter.hint')}</div>

            <div className="flex items-center gap-1.5">
                <FaSearch className="shrink-0 text-zinc-400" size={10} />
                <input
                    className={HOUSEKEEPING_INPUT_CLASS}
                    placeholder={LocalizeText('housekeeping.hotel.wordfilter.search')}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                {list && <HousekeepingPill>{rows.length}</HousekeepingPill>}
            </div>

            {error && <HousekeepingEmptyState>{LocalizeText(error)}</HousekeepingEmptyState>}
            {!error && !list && isLoading && <HousekeepingEmptyState>{LocalizeText('generic.loading')}</HousekeepingEmptyState>}
            {!error && list && rows.length === 0 && <HousekeepingEmptyState>{LocalizeText('housekeeping.hotel.wordfilter.empty')}</HousekeepingEmptyState>}

            {!error && rows.length > 0 && (
                <div className="max-h-[260px] overflow-auto rounded border border-zinc-200 bg-white">
                    <table className="w-full border-collapse text-[11px]">
                        <thead className="sticky top-0 bg-zinc-100">
                            <tr>
                                {['word', 'replacement', 'flags'].map((name) => (
                                    <th key={name} className="px-1.5 py-1 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                                        {LocalizeText(`housekeeping.hotel.wordfilter.column.${name}`)}
                                    </th>
                                ))}
                                <th className="w-6" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                const entry = cell(row, 'word');
                                const flags = ['hide', 'report', 'prefix'].filter((flag) => cell(row, flag) === '1');
                                const mute = parseInt(cell(row, 'mute')) || 0;

                                return (
                                    <tr key={entry} className="border-t border-zinc-100 hover:bg-sky-50/50">
                                        <td className="break-all px-1.5 py-0.5 font-semibold text-zinc-800">{entry}</td>
                                        <td className="px-1.5 py-0.5 text-zinc-700">{cell(row, 'replacement')}</td>
                                        <td className="px-1.5 py-0.5">
                                            <div className="flex flex-wrap gap-0.5">
                                                {flags.map((flag) => (
                                                    <HousekeepingPill key={flag} tone="warning">
                                                        {LocalizeText(`housekeeping.hotel.wordfilter.flag.${flag}`)}
                                                    </HousekeepingPill>
                                                ))}
                                                {mute > 0 && (
                                                    <HousekeepingPill tone="danger">
                                                        {LocalizeText('housekeeping.hotel.wordfilter.flag.mute', ['minutes'], [String(mute)])}
                                                    </HousekeepingPill>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-1 py-0.5">
                                            <button
                                                className="text-zinc-400 hover:text-rose-600 disabled:opacity-40"
                                                disabled={isActionPending}
                                                title={LocalizeText('housekeeping.hotel.wordfilter.remove')}
                                                type="button"
                                                onClick={() => remove(entry)}
                                            >
                                                <FaTrash size={9} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </HousekeepingSection>
    );
};
