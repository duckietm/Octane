import { GetIsBadgeRequestFulfilledComposer, IsBadgeRequestFulfilledEvent, RequestABadgeComposer } from '@octane/renderer';
import { useCallback, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

/**
 * The badge a hotel view element offers. The element asks whether the visitor already claimed it
 * when it appears, and claims it on click; the hotel answers the same packet either way, so one map
 * of request code to claimed covers both.
 */
export const useBadgeRequest = () => {
    const [claimed, setClaimed] = useState<Record<string, boolean>>({});

    const ask = useCallback((requestCode: string) => {
        if (!requestCode) return;

        SendMessageComposer(new GetIsBadgeRequestFulfilledComposer(requestCode));
    }, []);

    const claim = useCallback((requestCode: string) => {
        if (!requestCode) return;

        SendMessageComposer(new RequestABadgeComposer(requestCode));
    }, []);

    useMessageEvent<IsBadgeRequestFulfilledEvent>(IsBadgeRequestFulfilledEvent, (event) => {
        const parser = event.getParser();

        setClaimed((previous) => ({ ...previous, [parser.requestCode]: parser.fulfilled }));
    });

    return { claimed, ask, claim };
};
