import type { OfficialRoomEntryData, PromotedRoomsFolderData } from '@octane/renderer';
import { GetOfficialRoomsMessageComposer, OfficialRoomsEvent } from '@octane/renderer';
import { useCallback, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** `class_3685.type`: 1 = tag search, 2 = guest room, 4 = folder. */
export const OFFICIAL_ROOM_TYPE_TAG = 1;
export const OFFICIAL_ROOM_TYPE_GUEST_ROOM = 2;
export const OFFICIAL_ROOM_TYPE_FOLDER = 4;

/**
 * `OfficialRoomListCtrl.getVisibleEntries`: an entry with `folderId > 0` only
 * shows while the folder whose `index` it carries is the last open folder seen
 * in the list; everything else is top level.
 */
export const getVisibleOfficialRoomEntries = (entries: readonly OfficialRoomEntryData[], openFolderIndexes: ReadonlySet<number>): OfficialRoomEntryData[] => {
    const visible: OfficialRoomEntryData[] = [];

    let openFolderIndex = 0;

    for (const entry of entries) {
        if (entry.folderId > 0) {
            if (entry.folderId === openFolderIndex) visible.push(entry);

            continue;
        }

        openFolderIndex = openFolderIndexes.has(entry.index) ? entry.index : 0;
        visible.push(entry);
    }

    return visible;
};

const useOfficialRoomsState = () => {
    const [entries, setEntries] = useState<OfficialRoomEntryData[]>([]);
    const [adRoom, setAdRoom] = useState<OfficialRoomEntryData | null>(null);
    const [promotedRooms, setPromotedRooms] = useState<PromotedRoomsFolderData[]>([]);
    const [openFolderIndexes, setOpenFolderIndexes] = useState<Set<number>>(new Set());
    const [loaded, setLoaded] = useState(false);

    useMessageEvent<OfficialRoomsEvent>(OfficialRoomsEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        const nextEntries = parser.data?.entries ?? [];

        setEntries(nextEntries);
        setAdRoom(parser.adRoom ?? null);
        setPromotedRooms(parser.promotedRooms?.entries ?? []);
        setOpenFolderIndexes(new Set(nextEntries.filter((entry) => entry.type === OFFICIAL_ROOM_TYPE_FOLDER && entry.open).map((entry) => entry.index)));
        setLoaded(true);
    });

    /** `HabboNavigator.requestOfficialRooms`: the int is the ad slot index. */
    const requestOfficialRooms = useCallback((adIndex: number = 0) => {
        SendMessageComposer(new GetOfficialRoomsMessageComposer(adIndex));
    }, []);

    const toggleFolder = useCallback((index: number) => {
        setOpenFolderIndexes((prev) => {
            const next = new Set(prev);

            if (next.has(index)) next.delete(index);
            else next.add(index);

            return next;
        });
    }, []);

    return { entries, adRoom, promotedRooms, openFolderIndexes, loaded, requestOfficialRooms, toggleFolder };
};

export const useOfficialRooms = () => useSharedHook(useOfficialRoomsState);

registerSharedHook(useOfficialRoomsState);
