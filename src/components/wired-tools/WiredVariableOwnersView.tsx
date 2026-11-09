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

export { HOLDER_TYPE_FURNI, HOLDER_TYPE_ROOM, HOLDER_TYPE_USER };
export type { WiredHolderDescription };

/** Holders per page, as the official overview shows them. */
export const WIRED_VARIABLE_OWNERS_PAGE_SIZE = 50;
/** Above the server's own 250 ms limit on the page request. */
const REQUEST_PAGE_RATELIMIT = 300;

/** The server's `userTypeFilter` values. */
const USER_FILTER_ALL = 0;
const USER_FILTER_IN_ROOM = 1;
/** The server's `sortTypeFilter` values; -1 keeps the natural order. */
const SORT_NONE = -1;
const SORT_VALUE_ASCENDING = 0;
const SORT_VALUE_DESCENDING = 1;
const SORT_NAME = 2;

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
    const [sortType, setSortType] = useState(SORT_NONE);
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
                sortTypeFilter: page?.sortTypeFilter ?? SORT_NONE
            };

            SendMessageComposer(
                new WiredVariableHoldersPageComposer(variableId, requested, WIRED_VARIABLE_OWNERS_PAGE_SIZE, filters.userTypeFilter, filters.sortTypeFilter)
            );
        }
    });

    // The first page of a new variable, unfiltered.
    useEffect(() => {
        setPage(null);
        SendMessageComposer(new WiredVariableHoldersPageComposer(variableId, 1, WIRED_VARIABLE_OWNERS_PAGE_SIZE, USER_FILTER_ALL, SORT_NONE));
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
        options: [
            { value: String(USER_FILTER_ALL), label: localizeWithFallback('wiredmenu.variable_management.usertype.all', 'All') },
            { value: String(USER_FILTER_IN_ROOM), label: localizeWithFallback('wiredmenu.variable_management.usertype.in_room', 'In the room') }
        ],
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
        options: [
            { value: String(SORT_NONE), label: localizeWithFallback('wiredmenu.variable_management.sort_by.none', 'Default order') },
            { value: String(SORT_VALUE_DESCENDING), label: localizeWithFallback('wiredmenu.variable_management.sort_by.highest', 'Highest value') },
            { value: String(SORT_VALUE_ASCENDING), label: localizeWithFallback('wiredmenu.variable_management.sort_by.lowest', 'Lowest value') },
            { value: String(SORT_NAME), label: localizeWithFallback('wiredmenu.variable_management.sort_by.name', 'Name') }
        ],
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
