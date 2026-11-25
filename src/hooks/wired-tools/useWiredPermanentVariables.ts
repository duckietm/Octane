import {
    IWiredPermanentVariable,
    WiredPermanentVariableSetComposer,
    WiredPermanentVariablesRequestComposer,
    WiredUserPermanentVariablesListEvent
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** AIR sends every holder of a user variable as entity type 1 (a Habbo). */
export const WIRED_PERMANENT_VARIABLES_ENTITY_TYPE = 1;

/** AIR VariableManagementDetailView actions of a change. */
export const WIRED_PERMANENT_VARIABLE_SET = 0;
export const WIRED_PERMANENT_VARIABLE_CREATE = 1;
export const WIRED_PERMANENT_VARIABLE_DELETE = 2;

/** The item id of a user variable id ("user:12" -> 12), or 0 when it is not one. */
export const permanentVariableItemId = (variableId: string): number => {
    const match = /^user:(\d+)$/.exec(variableId ?? '');

    return match ? Number(match[1]) : 0;
};

export interface WiredPermanentVariablesState {
    /** The holder's permanent variables; null until the server answered for this holder. */
    variables: IWiredPermanentVariable[] | null;
    /** The holder's figure, when the server knows it. */
    figure: string;
    refresh: () => void;
    change: (variableItemId: number, value: number, action: number) => void;
}

/**
 * The permanent variables of one holder (AIR VariableManagementDetailController), for a holder who is not in the
 * room: the room's own variable snapshot only covers the users inside. Asked for when a holder key is given and
 * dropped when it is not; the server answers every change with the list as it then is.
 */
export const useWiredPermanentVariables = (holderKey: number | null): WiredPermanentVariablesState => {
    const [state, setState] = useState<{ variables: IWiredPermanentVariable[]; figure: string } | null>(null);
    const wantedRef = useRef(holderKey);

    wantedRef.current = holderKey;

    const refresh = useCallback(() => {
        if (holderKey === null) return;

        SendMessageComposer(new WiredPermanentVariablesRequestComposer(WIRED_PERMANENT_VARIABLES_ENTITY_TYPE, holderKey));
    }, [holderKey]);

    useEffect(() => {
        setState(null);
        refresh();
    }, [refresh]);

    useMessageEvent<WiredUserPermanentVariablesListEvent>(WiredUserPermanentVariablesListEvent, (event) => {
        const parser = event.getParser();

        if (!parser || wantedRef.current === null || parser.entityId !== wantedRef.current) return;

        setState({ variables: parser.variables, figure: parser.entityFigure });
    });

    const change = useCallback(
        (variableItemId: number, value: number, action: number) => {
            if (holderKey === null || variableItemId <= 0) return;

            SendMessageComposer(
                new WiredPermanentVariableSetComposer(WIRED_PERMANENT_VARIABLES_ENTITY_TYPE, holderKey, `user:${variableItemId}`, value, action)
            );
        },
        [holderKey]
    );

    return { variables: state?.variables ?? null, figure: state?.figure ?? '', refresh, change };
};
