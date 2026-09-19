import { FC, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Column, Flex, LayoutFurniIconImageView, Text } from '../../../common';
import { FurniItem } from '../../../hooks/furni-editor';
import { suggestInteractionType } from '../furniEditorSuggestions';

interface FurniEditorSearchViewProps {
    items: FurniItem[];
    total: number;
    page: number;
    loading: boolean;
    // Registered interaction types: a row whose stored type is not among them,
    // or whose classname points at another one, is flagged as worth a look.
    interactions: string[];
    onSearch: (query: string, type: string, page: number, sortField: string, sortDir: string) => void;
    onSelect: (id: number) => void;
}

const attention = (item: FurniItem, interactions: string[]): string | null => {
    const stored = item.interactionType.trim().toLowerCase();
    if (stored && !interactions.some((known) => known.toLowerCase() === stored)) return `type "${item.interactionType}" has no class, behaves as default`;
    const hint = suggestInteractionType(item.itemName, interactions);
    if (hint && hint.type.toLowerCase() !== stored) return `classname suggests "${hint.type}" (${hint.reason})`;
    return null;
};

type SortField = 'id' | 'spriteId' | 'itemName' | 'publicName' | 'type' | 'interactionType';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

const COLUMNS: { field: SortField; label: string; align: 'left' | 'center' }[] = [
    { field: 'id', label: 'ID', align: 'left' },
    { field: 'spriteId', label: 'Sprite', align: 'left' },
    { field: 'itemName', label: 'Name', align: 'left' },
    { field: 'publicName', label: 'Public Name', align: 'left' },
    { field: 'type', label: 'Type', align: 'center' },
    { field: 'interactionType', label: 'Interaction', align: 'left' }
];

const SortArrow: FC<{ field: SortField; active: SortField; dir: SortDir }> = ({ field, active, dir }) => {
    if (field !== active) return <span className="ml-1 text-slate-300">↕</span>;

    return <span className="ml-1 text-primary">{dir === 'asc' ? '▲' : '▼'}</span>;
};

const PagBtn: FC<{ disabled?: boolean; onClick: () => void; children: ReactNode; title?: string }> = ({ disabled, onClick, children, title }) => (
    <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={onClick}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-[#ffffff] text-slate-600 text-sm leading-none hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
    >
        {children}
    </button>
);

export const FurniEditorSearchView: FC<FurniEditorSearchViewProps> = (props) => {
    const { items, total, page, loading, interactions, onSearch, onSelect } = props;
    const [onlyFlagged, setOnlyFlagged] = useState(false);
    const flagged = items.map((item) => attention(item, interactions));
    const flaggedCount = flagged.filter(Boolean).length;
    const rows = items.map((item, index) => ({ item, note: flagged[index] })).filter((row) => !onlyFlagged || row.note);
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [sortField, setSortField] = useState<SortField>('id');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [pageInput, setPageInput] = useState('1');

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);

    // Latest filter/sort for the debounced query effect (avoids stale closure).
    const stateRef = useRef({ typeFilter, sortField, sortDir });
    stateRef.current = { typeFilter, sortField, sortDir };

    // Initial fetch (once).
    const didInit = useRef(false);
    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;
        onSearch('', '', 1, 'id', 'asc');
    }, [onSearch]);

    // Keep the page input synced with the authoritative page from the server.
    useEffect(() => {
        setPageInput(String(page));
    }, [page]);

    // Debounced live search as the user types (skips the first render).
    const firstQuery = useRef(true);
    useEffect(() => {
        if (firstQuery.current) {
            firstQuery.current = false;
            return;
        }

        const handle = window.setTimeout(() => {
            const s = stateRef.current;
            onSearch(query, s.typeFilter, 1, s.sortField, s.sortDir);
        }, 350);

        return () => window.clearTimeout(handle);
    }, [query, onSearch]);

    const applyType = useCallback(
        (t: string) => {
            const next = typeFilter === t ? '' : t;
            setTypeFilter(next);
            onSearch(query, next, 1, sortField, sortDir);
        },
        [typeFilter, query, sortField, sortDir, onSearch]
    );

    const applySort = useCallback(
        (field: SortField) => {
            const nextDir: SortDir = sortField === field && sortDir === 'asc' ? 'desc' : 'asc';
            setSortField(field);
            setSortDir(nextDir);
            onSearch(query, typeFilter, 1, field, nextDir);
        },
        [sortField, sortDir, query, typeFilter, onSearch]
    );

    const goTo = useCallback(
        (pg: number) => {
            const clamped = Math.min(Math.max(1, pg || 1), totalPages);
            onSearch(query, typeFilter, clamped, sortField, sortDir);
        },
        [totalPages, query, typeFilter, sortField, sortDir, onSearch]
    );

    const inputClass =
        'w-full pl-9 pr-8 py-2 text-sm leading-normal rounded-lg border border-slate-300 bg-[#ffffff] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition';

    return (
        <Column gap={2} className="h-full">
            {/* Search + filters */}
            <Flex gap={2} alignItems="center">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg
                            className="w-4 h-4"
                            viewBox="0 0 20 20"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="8.5" cy="8.5" r="5.5" />
                            <line x1="12.7" y1="12.7" x2="18" y2="18" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        className={inputClass}
                        placeholder="Search by ID, name or sprite ID…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-[11px] text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                        >
                            ✕
                        </button>
                    )}
                </div>
                <Flex gap={1}>
                    {['', 's', 'i'].map((t) => {
                        const on = typeFilter === t;

                        return (
                            <button
                                key={t || 'all'}
                                type="button"
                                onClick={() => applyType(t)}
                                className={`px-3 py-1.5 text-[12px] font-medium rounded-lg border transition ${on ? 'bg-[#418db0] border-[#418db0] text-[#ffffff] shadow-sm' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200 hover:text-slate-600'}`}
                            >
                                {t === '' ? 'All' : t === 's' ? 'Floor' : 'Wall'}
                            </button>
                        );
                    })}
                </Flex>
            </Flex>

            {/* Result count + activity */}
            <Flex alignItems="center" gap={2} className="px-0.5">
                <Text className="text-[11px] text-slate-500">
                    {total > 0 ? `Showing ${from}–${to} of ${total.toLocaleString()}` : loading ? 'Searching…' : 'No results'}
                </Text>
                {loading && <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-primary animate-spin" />}
                {flaggedCount > 0 && (
                    <button
                        type="button"
                        onClick={() => setOnlyFlagged((prev) => !prev)}
                        aria-pressed={onlyFlagged}
                        title="Rows whose interaction type has no class or does not match the classname"
                        className={`ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium rounded-full border px-2 py-0.5 transition ${onlyFlagged ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-[#ffffff] border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                        {flaggedCount} to check on this page
                    </button>
                )}
            </Flex>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 shadow-sm bg-[#ffffff]">
                <table className="w-full text-xs border-collapse">
                    <thead>
                        <tr className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 select-none">
                            <th className="px-2 py-2 w-[52px]"></th>
                            {COLUMNS.map((c) => (
                                <th
                                    key={c.field}
                                    onClick={() => applySort(c.field)}
                                    className={`px-2 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 cursor-pointer hover:text-slate-700 ${c.align === 'center' ? 'text-center' : 'text-left'}`}
                                >
                                    {c.label}
                                    <SortArrow field={c.field} active={sortField} dir={sortDir} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(({ item, note }) => (
                            <tr
                                key={item.id}
                                onClick={() => onSelect(item.id)}
                                title={note ?? undefined}
                                className="group cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                            >
                                <td className="px-2 py-1.5">
                                    <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 group-hover:border-slate-200 flex items-center justify-center overflow-hidden">
                                        <LayoutFurniIconImageView productType={item.type} productClassId={item.spriteId} />
                                    </div>
                                </td>
                                <td className="px-2 py-1.5 font-mono text-slate-500">{item.id}</td>
                                <td className="px-2 py-1.5 font-mono text-slate-500">{item.spriteId}</td>
                                <td className="px-2 py-1.5 text-slate-700 font-medium truncate max-w-[160px]" title={note ?? item.itemName}>
                                    {note && <span aria-label={note} className="inline-block w-1.5 h-1.5 rounded-full bg-[#f59e0b] mr-1.5 align-middle" />}
                                    {item.itemName}
                                </td>
                                <td className="px-2 py-1.5 text-slate-500 truncate max-w-[150px]" title={item.publicName}>
                                    {item.publicName || '—'}
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded-md text-[#ffffff] text-[10px] font-semibold ${item.type === 's' ? 'bg-[#418db0]' : 'bg-[#64748b]'}`}
                                    >
                                        {item.type === 's' ? 'Floor' : 'Wall'}
                                    </span>
                                </td>
                                <td className="px-2 py-1.5">
                                    {item.interactionType ? (
                                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-mono">
                                            {item.interactionType}
                                        </span>
                                    ) : (
                                        <span className="text-slate-300">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 &&
                            loading &&
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={`sk-${i}`} className="border-b border-slate-100">
                                    <td className="px-2 py-1.5">
                                        <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                                    </td>
                                    {COLUMNS.map((c) => (
                                        <td key={c.field} className="px-2 py-1.5">
                                            <div className="h-3 rounded bg-slate-100 animate-pulse" />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        {items.length === 0 && !loading && (
                            <tr>
                                <td colSpan={7} className="px-2 py-10 text-center">
                                    <div className="text-slate-400 text-sm">No furni found</div>
                                    <div className="text-slate-300 text-[11px] mt-0.5">Try a different search or filter</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <Flex justifyContent="between" alignItems="center" className="px-0.5">
                <Text className="text-[11px] text-slate-400">{total.toLocaleString()} items</Text>
                <Flex alignItems="center" gap={1}>
                    <PagBtn title="First" disabled={page <= 1} onClick={() => goTo(1)}>
                        «
                    </PagBtn>
                    <PagBtn title="Previous" disabled={page <= 1} onClick={() => goTo(page - 1)}>
                        ‹
                    </PagBtn>
                    <Flex alignItems="center" gap={1} className="px-1 text-[11px] text-slate-500">
                        <input
                            type="text"
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value.replace(/[^0-9]/g, ''))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') goTo(Number(pageInput));
                            }}
                            className="w-12 px-1.5 py-1 text-center rounded-lg border border-slate-200 bg-[#ffffff] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                        />
                        <span className="text-slate-400">/ {totalPages.toLocaleString()}</span>
                    </Flex>
                    <PagBtn title="Next" disabled={page >= totalPages} onClick={() => goTo(page + 1)}>
                        ›
                    </PagBtn>
                    <PagBtn title="Last" disabled={page >= totalPages} onClick={() => goTo(totalPages)}>
                        »
                    </PagBtn>
                </Flex>
            </Flex>
        </Column>
    );
};
