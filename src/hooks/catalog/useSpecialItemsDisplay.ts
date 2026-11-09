import {
    AddLinkEventTracker,
    ClaimFreeProductComposer,
    GetHasClaimedProductComposer,
    GetSessionDataManager,
    HasClaimedProductEvent,
    ILinkEventTracker,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { GetConfigurationValue, SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';
import {
    claimStateAfterAllVisited,
    claimStateAfterResponse,
    initialClaimState,
    initialRotation,
    parseSpecialItems,
    parseSpecialItemsLink,
    SPECIAL_ITEMS_LINK_PREFIX,
    SpecialItem,
    SpecialItemsClaimState,
    SpecialItemsClaimStateValue,
    specialItemsRotationReducer
} from './specialItemsDisplay.helpers';

/**
 * The special items display (`special_items_display/<key>`), as the official
 * `SpecialItemsController`: the showcase's furni come from the client
 * configuration (`special_items.<key>.items`), and an optional free claim
 * (`special_items.<key>.free_claim`) is asked about (395) when the window
 * opens and claimed (3935) once every item has been viewed.
 */
export const useSpecialItemsDisplay = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [setKey, setSetKey] = useState('');
    const [items, setItems] = useState<SpecialItem[]>([]);
    const [freeClaim, setFreeClaim] = useState('');
    const [claimState, setClaimState] = useState<SpecialItemsClaimStateValue>(SpecialItemsClaimState.NOT_APPLICABLE);
    const [rotation, dispatch] = useReducer(specialItemsRotationReducer, undefined, initialRotation);
    const lastKeyRef = useRef('');
    const count = items.length;

    const open = useCallback((key: string) => {
        const parsed = parseSpecialItems(GetConfigurationValue<string>(`special_items.${key}.items`, '') ?? '', (className) =>
            GetSessionDataManager().getFloorItemDataByName(className)
        );

        if (!parsed.length) return;

        const claim = GetConfigurationValue<string>(`special_items.${key}.free_claim`, '') ?? '';

        setSetKey(key);
        setItems(parsed);
        setFreeClaim(claim);
        setClaimState(initialClaimState(claim));

        // A new showcase restarts at its first item; reopening the same one keeps the rotation.
        if (key !== lastKeyRef.current) dispatch({ type: 'reset' });

        lastKeyRef.current = key;

        if (claim.length > 0) SendMessageComposer(new GetHasClaimedProductComposer(claim));

        setIsVisible(true);
    }, []);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const key = parseSpecialItemsLink(url);

                if (key !== null) open(key);
            },
            eventUrlPrefix: SPECIAL_ITEMS_LINK_PREFIX
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [open]);

    useMessageEvent<HasClaimedProductEvent>(HasClaimedProductEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setClaimState((state) => claimStateAfterResponse(state, freeClaim, parser.claimId, parser.claimed));
    });

    // `_r0ae26fac6ca7ed`: browsing with every item seen means the claim can be made.
    useEffect(() => {
        if (claimState !== SpecialItemsClaimState.BROWSING || !count) return;

        let seen = 0;

        for (let index = 0; index < count; index++) if (rotation.visited.has(index)) seen++;

        if (seen === count) setClaimState((state) => claimStateAfterAllVisited(state, freeClaim));
    }, [claimState, count, freeClaim, rotation.visited]);

    // The platform turns per animation frame while it has somewhere to go.
    useEffect(() => {
        if (!isVisible || !rotation.carousel.animating) return;

        let frame = 0;
        let last = performance.now();

        const tick = (now: number) => {
            dispatch({ type: 'tick', count, deltaMs: now - last });
            last = now;
            frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [count, isVisible, rotation.carousel.animating]);

    const claim = useCallback(() => {
        if (claimState !== SpecialItemsClaimState.CLAIMABLE || !freeClaim) return;

        SendMessageComposer(new ClaimFreeProductComposer(freeClaim));
        setClaimState(SpecialItemsClaimState.CLAIMED);
    }, [claimState, freeClaim]);

    return {
        isVisible,
        setKey,
        items,
        claimState,
        rotation,
        close: () => setIsVisible(false),
        navigateTo: (index: number) => dispatch({ type: 'navigate', index }),
        next: () => dispatch({ type: 'next', count }),
        previous: () => dispatch({ type: 'previous', count }),
        claim
    };
};
