import { useCallback, useEffect, useState } from 'react';
import { WIRED_VARIABLES_POLL_MS } from '../../components/wired-tools/WiredCreatorTools.constants';

export interface WiredArrayInspectionTarget {
    variableType: number;
    requestedOwnerId: number;
    definitionItemId: number;
}

export const useWiredArrayInspectionPage = (
    active: boolean,
    target: WiredArrayInspectionTarget | null,
    request: (type: number, ownerId: number, definitionId: number, page: number, pageSize: number) => void,
    clear: () => void
) => {
    const variableType = target?.variableType;
    const ownerId = target?.requestedOwnerId;
    const definitionId = target?.definitionItemId;
    const key = target ? `${variableType}:${ownerId}:${definitionId}` : '';
    const [selection, setSelection] = useState({ key: '', page: 0 });
    const page = selection.key === key ? selection.page : 0;

    useEffect(() => {
        if (!active || definitionId === undefined) {
            clear();
            return;
        }

        const refresh = () => request(variableType, ownerId, definitionId, page, 25);
        refresh();
        const interval = window.setInterval(refresh, WIRED_VARIABLES_POLL_MS);

        return () => window.clearInterval(interval);
    }, [active, variableType, ownerId, definitionId, page, request, clear]);

    return useCallback(
        (nextPage: number) => {
            const normalizedPage = Math.max(0, Math.trunc(nextPage));
            setSelection({ key, page: normalizedPage });

            if (active && definitionId !== undefined && normalizedPage === page) {
                request(variableType, ownerId, definitionId, normalizedPage, 25);
            }
        },
        [active, key, page, variableType, ownerId, definitionId, request]
    );
};
