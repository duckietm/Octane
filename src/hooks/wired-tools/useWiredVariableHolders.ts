import { IWiredVariableHolderValue, WiredVariableHoldersEvent, WiredVariableHoldersRequestComposer } from '@octane/renderer';
import { useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/** AIR WiredMenuOverviewTab: the holders of the highlighted variable are asked for again every 500 ms. */
export const WIRED_VARIABLE_HOLDERS_POLL_MS = 500;

/**
 * Every holder of one wired variable in the room (AIR requestHolders), polled while a variable id is given and
 * dropped when it is not. Answers for another room or variable are ignored.
 */
export const useWiredVariableHolders = (variableId: string | null, roomId: number): IWiredVariableHolderValue[] | null => {
    const [holders, setHolders] = useState<IWiredVariableHolderValue[] | null>(null);
    const wantedRef = useRef({ variableId, roomId });

    wantedRef.current = { variableId, roomId };

    useEffect(() => {
        setHolders(null);

        if (!variableId) return;

        const request = () => SendMessageComposer(new WiredVariableHoldersRequestComposer(variableId));

        request();

        const interval = window.setInterval(request, WIRED_VARIABLE_HOLDERS_POLL_MS);

        return () => window.clearInterval(interval);
    }, [variableId, roomId]);

    useMessageEvent<WiredVariableHoldersEvent>(WiredVariableHoldersEvent, (event) => {
        const parser = event.getParser();
        const wanted = wantedRef.current;

        if (!parser || !wanted.variableId) return;
        if (parser.roomId !== wanted.roomId || parser.variable?.variableId !== wanted.variableId) return;

        setHolders(parser.holders ?? []);
    });

    return holders;
};
