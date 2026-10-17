import { Autocomplete } from '@base-ui/react/autocomplete';
import { FC, useEffect, useRef, useState } from 'react';
import { FaCircle, FaHome, FaSearch, FaUser } from 'react-icons/fa';
import { HousekeepingTabId, LocalizeText, parseHousekeepingSearch } from '../../../../api';
import { useHousekeepingStore } from '../../../../hooks';

interface SearchRow {
    key: string;
    kind: 'user' | 'room';
    id: number;
    label: string;
    hint: string;
    online?: boolean;
}

/**
 * One box for users and rooms: a name searches both, "#12" opens user 12,
 * "s:411" opens room 411, and an empty box lists the recent lookups.
 */
export const HousekeepingGlobalSearch: FC = () => {
    const { userSuggestions, roomSuggestions, requestUserSuggestions, requestRoomSuggestions, recentLookups, lookupUserById, lookupRoomById, setActiveTab } =
        useHousekeepingStore();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const boxRef = useRef<HTMLDivElement>(null);
    const listHostRef = useRef<HTMLDivElement>(null);
    const parsed = parseHousekeepingSearch(query);
    const searchText = parsed.kind === 'text' ? parsed.text : '';

    useEffect(() => {
        requestUserSuggestions(searchText);
        requestRoomSuggestions(searchText);
    }, [searchText, requestUserSuggestions, requestRoomSuggestions]);

    const rows: SearchRow[] = (() => {
        switch (parsed.kind) {
            case 'user-id':
                return [
                    {
                        key: `u${parsed.id}`,
                        kind: 'user',
                        id: parsed.id,
                        label: LocalizeText('housekeeping.search.open_user', ['id'], [String(parsed.id)]),
                        hint: ''
                    }
                ];
            case 'room-id':
                return [
                    {
                        key: `r${parsed.id}`,
                        kind: 'room',
                        id: parsed.id,
                        label: LocalizeText('housekeeping.search.open_room', ['id'], [String(parsed.id)]),
                        hint: ''
                    }
                ];
            case 'text':
                return [
                    ...userSuggestions.map((user) => ({
                        key: `u${user.id}`,
                        kind: 'user' as const,
                        id: user.id,
                        label: user.username,
                        hint: `#${user.id}`,
                        online: user.online
                    })),
                    ...roomSuggestions.map((room) => ({ key: `r${room.id}`, kind: 'room' as const, id: room.id, label: room.name, hint: room.ownerName }))
                ];
            case 'empty':
                return recentLookups
                    .slice(0, 8)
                    .map((entry) => ({ key: `${entry.kind}${entry.id}`, kind: entry.kind, id: entry.id, label: entry.label, hint: `#${entry.id}` }));
            default:
                return [];
        }
    })();

    const open = (row: SearchRow) => {
        if (row.kind === 'user') {
            setActiveTab(HousekeepingTabId.USERS);
            lookupUserById(row.id);
        } else {
            setActiveTab(HousekeepingTabId.ROOMS);
            lookupRoomById(row.id);
        }

        setQuery('');
        setIsOpen(false);
    };

    const rowByKey = new Map(rows.map((row) => [row.key, row]));

    return (
        <div className="relative">
            <div ref={listHostRef} />
            <Autocomplete.Root
                autoHighlight="always"
                filter={null}
                items={rows.map((row) => row.key)}
                mode="list"
                open={isOpen && (rows.length > 0 || parsed.kind === 'text')}
                value={query}
                onOpenChange={setIsOpen}
                onValueChange={(next, details) => {
                    // The rows are actions, not values: a picked row opens its user or room and the box is cleared.
                    if (details.reason === 'item-press') {
                        const row = rowByKey.get(next);

                        if (row) open(row);

                        return;
                    }

                    setQuery(next);
                    setIsOpen(true);
                }}
            >
                <div
                    ref={boxRef}
                    className="flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-1.5 py-1 focus-within:border-sky-400 focus-within:ring-1 focus-within:ring-sky-300"
                >
                    <FaSearch className="shrink-0 text-zinc-400" size={10} />
                    <Autocomplete.Input
                        aria-label={LocalizeText('housekeeping.search.placeholder')}
                        className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:italic placeholder:text-zinc-400"
                        placeholder={LocalizeText('housekeeping.search.placeholder')}
                        onFocus={() => setIsOpen(true)}
                    />
                </div>
                <Autocomplete.Portal container={listHostRef}>
                    <Autocomplete.Positioner align="start" anchor={boxRef} className="z-40" sideOffset={4}>
                        <Autocomplete.Popup className="octane-hk-popover w-[260px] overflow-hidden rounded border border-zinc-200 bg-white shadow-lg">
                            {parsed.kind === 'empty' && rows.length > 0 && (
                                <div className="border-b border-zinc-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-400">
                                    {LocalizeText('housekeeping.user.recent')}
                                </div>
                            )}
                            {rows.length === 0 && <div className="px-2 py-1.5 text-[11px] italic text-zinc-500">{LocalizeText('housekeeping.search.no_results')}</div>}
                            <Autocomplete.List>
                                {(key: string) => {
                                    const row = rowByKey.get(key);

                                    if (!row) return null;

                                    return (
                                        <Autocomplete.Item
                                            key={key}
                                            className="flex w-full cursor-pointer items-center gap-1.5 px-2 py-1 text-left text-xs data-[highlighted]:bg-sky-50"
                                            value={key}
                                        >
                                            {row.kind === 'user' ? (
                                                <FaUser className="shrink-0 text-sky-500" size={9} />
                                            ) : (
                                                <FaHome className="shrink-0 text-violet-500" size={10} />
                                            )}
                                            <span className="grow truncate font-medium">{row.label}</span>
                                            {row.online !== undefined && <FaCircle className={row.online ? 'text-emerald-500' : 'text-zinc-300'} size={6} />}
                                            {row.hint && <span className="max-w-[80px] shrink-0 truncate text-[10px] text-zinc-500">{row.hint}</span>}
                                        </Autocomplete.Item>
                                    );
                                }}
                            </Autocomplete.List>
                        </Autocomplete.Popup>
                    </Autocomplete.Positioner>
                </Autocomplete.Portal>
            </Autocomplete.Root>
        </div>
    );
};
