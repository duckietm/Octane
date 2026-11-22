import { IWiredVariableHolder, WiredVariableHoldersPageComposer, WiredVariableHoldersPageEvent } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../api';
import { GetUserProfile } from '../../api/user/GetUserProfile';
import { useMessageEvent } from '../../hooks';
import { useWiredPageRequests } from '../../hooks/wired-tools/useWiredPageRequests';
import { VariableManageEntry, VariablesElementType } from './WiredCreatorTools.types';
import { calculateLastPage, NO_PAGE } from './WiredPaging.helpers';
import { HOLDER_TYPE_FURNI, HOLDER_TYPE_ROOM, HOLDER_TYPE_USER, WiredHolderDescription, WiredVariableOwnersPanel } from './WiredVariableOwnersPanel';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

export { HOLDER_TYPE_FURNI, HOLDER_TYPE_USER };
/** @public */
export { HOLDER_TYPE_ROOM };
export type { WiredHolderDescription };

/** Holders per page, as the official overview shows them. */
export const WIRED_VARIABLE_OWNERS_PAGE_SIZE = 50;
/** Above the server's own 250 ms limit on the page request. */
const REQUEST_PAGE_RATELIMIT = 300;

/** AIR's user type menu: all, Habbo, pet, bot. */
const USER_FILTER_ALL = -1;
const USER_FILTERS: ReadonlyArray<{ value: number; key: string; fallback: string }> = [
    { value: USER_FILTER_ALL, key: 'wiredmenu.variable_management.usertype.all', fallback: 'All' },
    { value: 1, key: 'wiredmenu.variable_management.usertype.1', fallback: 'Habbo' },
    { value: 2, key: 'wiredmenu.variable_management.usertype.2', fallback: 'Pet' },
    { value: 4, key: 'wiredmenu.variable_management.usertype.4', fallback: 'Bot' }
];
/** AIR's sort menu, in its order; the first page asks for the highest value. */
const SORT_HIGHEST_VALUE = 0;
const SORTS: ReadonlyArray<{ value: number; fallback: string }> = [
    { value: SORT_HIGHEST_VALUE, fallback: 'Highest value' },
    { value: 1, fallback: 'Lowest value' },
    { value: 2, fallback: 'Oldest creation' },
    { value: 3, fallback: 'Latest creation' },
    { value: 4, fallback: 'Oldest update' },
    { value: 5, fallback: 'Latest update' }
];

interface HoldersPage {
    variableId: string;
    totalEntries: number;
    currentPage: number;
    elements: IWiredVariableHolder[];
    userTypeFilter: number;
    sortTypeFilter: number;
}

export interface WiredVariableOwnersViewProps {
    variableId: string;
    variableName: string;
    variablesType: VariablesElementType;
    hasValue: boolean;
    /** The room's own knowledge of a holder (Habbo / Bot / Pet, floor / wall furni), when it is in the room. */
    describeHolder: (entityType: number, entityId: number, entityName: string) => WiredHolderDescription;
    onManage: (entry: VariableManageEntry) => void;
    onClose: () => void;
}

/**
 * Who holds a wired variable, a page of 50 at a time from the server: user type, name (a link
 * to a user's profile), creation and last update time, value, and "manage", which opens the
 * holder in the detail panel. The user type and sort menus ask for page 1 again; every page that
 * arrives puts its own filters back into the menus.
 */
export const WiredVariableOwnersView = (props: WiredVariableOwnersViewProps) => {
    const { variableId, variableName, variablesType, hasValue, describeHolder, onManage, onClose } = props;
    const [page, setPage] = useState<HoldersPage | null>(null);
    const [userType, setUserType] = useState(USER_FILTER_ALL);
    const [sortType, setSortType] = useState(SORT_HIGHEST_VALUE);
    const [scrollKey, setScrollKey] = useState(0);
    const nextFilters = useRef<{ userTypeFilter: number; sortTypeFilter: number } | null>(null);

    useMessageEvent<WiredVariableHoldersPageEvent>(WiredVariableHoldersPageEvent, (event) => {
        const parser = event.getParser();

        if (parser.variableId !== variableId) return;

        setPage({
            variableId: parser.variableId,
            totalEntries: parser.totalEntries,
            currentPage: parser.currentPage,
            elements: [...parser.elements],
            userTypeFilter: parser.userTypeFilter,
            sortTypeFilter: parser.sortTypeFilter
        });
        setUserType(parser.userTypeFilter);
        setSortType(parser.sortTypeFilter);
        setScrollKey((key) => key + 1);
    });

    const currentPage = page?.currentPage ?? NO_PAGE;
    const lastPage = page ? calculateLastPage(page.totalEntries, WIRED_VARIABLE_OWNERS_PAGE_SIZE) : NO_PAGE;

    const requests = useWiredPageRequests({
        currentPage,
        lastPage,
        pageKey: page,
        ratelimit: REQUEST_PAGE_RATELIMIT,
        onRequestPage: (requested) => {
            const filters = nextFilters.current ?? {
                userTypeFilter: page?.userTypeFilter ?? USER_FILTER_ALL,
                sortTypeFilter: page?.sortTypeFilter ?? SORT_HIGHEST_VALUE
            };

            SendMessageComposer(
                new WiredVariableHoldersPageComposer(variableId, requested, WIRED_VARIABLE_OWNERS_PAGE_SIZE, filters.sortTypeFilter, filters.userTypeFilter)
            );
        }
    });

    // The first page of a new variable: everyone, highest value first.
    useEffect(() => {
        setPage(null);
        SendMessageComposer(new WiredVariableHoldersPageComposer(variableId, 1, WIRED_VARIABLE_OWNERS_PAGE_SIZE, SORT_HIGHEST_VALUE, USER_FILTER_ALL));
    }, [variableId]);

    const changeFilters = (nextUserType: number, nextSortType: number) => {
        if (!requests.canRequestNewPage(false)) return;

        nextFilters.current = { userTypeFilter: nextUserType, sortTypeFilter: nextSortType };
        requests.requestPage(1);
        nextFilters.current = null;
    };

    const toManageEntry = (holder: IWiredVariableHolder): VariableManageEntry => {
        const description = describeHolder(holder.entityType, holder.entityId, holder.entityName);

        return {
            categoryLabel: description.categoryLabel,
            entityId: holder.entityId,
            entityName: description.entityName,
            createdAt: Math.floor(holder.storage.creationTime / 1000),
            updatedAt: Math.floor(holder.storage.lastUpdateTime / 1000),
            value: hasValue ? holder.storage.value : null,
            manageLabel: localizeWithFallback('wiredmenu.variable_management.manage', 'Manage')
        };
    };

    const userTypeFilter = {
        id: 'usertype',
        label: localizeWithFallback('wiredmenu.variable_management.usertype', 'User type:'),
        value: String(userType),
        options: USER_FILTERS.map((option) => ({ value: String(option.value), label: localizeWithFallback(option.key, option.fallback) })),
        onChange: (value: string) => {
            const next = Number(value);

            setUserType(next);
            changeFilters(next, sortType);
        }
    };

    const sortFilter = {
        id: 'sort',
        label: localizeWithFallback('wiredmenu.variable_management.sort_by', 'Sort by:'),
        value: String(sortType),
        options: SORTS.map((option) => ({
            value: String(option.value),
            label: localizeWithFallback(`wiredmenu.variable_management.sort_by.${option.value}`, option.fallback)
        })),
        onChange: (value: string) => {
            const next = Number(value);

            setSortType(next);
            changeFilters(userType, next);
        }
    };

    return (
        <NativeTextTree>
            <WiredVariableOwnersPanel
                variableName={variableName}
                variablesType={variablesType}
                hasValue={hasValue}
                holders={page?.elements ?? []}
                describeHolder={describeHolder}
                currentPage={currentPage}
                totalEntries={page?.totalEntries ?? 0}
                lastPage={lastPage}
                requests={requests}
                scrollResetKey={scrollKey}
                filters={variablesType === 'user' ? [userTypeFilter, sortFilter] : [sortFilter]}
                onManage={(holder) => onManage(toManageEntry(holder))}
                onOpenUserProfile={(entityId) => GetUserProfile(entityId)}
                onClose={onClose}
            />
        </NativeTextTree>
    );
};
