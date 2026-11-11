import {
    AddLinkEventTracker,
    ClaimFreeProductComposer,
    ClaimProductResultEvent,
    GetHasClaimedProductComposer,
    HasClaimedProductEvent,
    ILinkEventTracker,
    RemoveLinkEventTracker
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { GetConfigurationValue, SendMessageComposer } from '../../api';
import {
    CURSED_DRAGON_LINK_PREFIX,
    CursedDragonChoiceValue,
    CursedDragonClaimState,
    CursedDragonClaimStateValue,
    cursedDragonStateAfterCheck,
    cursedDragonStateAfterHasClaimed,
    cursedDragonStateAfterResult,
    isCursedDragonOpenLink,
    resolveCursedDragonClaimId,
    shouldFetchCursedDragonClaim
} from '../../api/catalog/CursedDragonAdoption';
import { useMessageEvent } from '../events';

/**
 * AIR CursedDragonAdoptionController: the window opens on `cursed_dragon_adoption/open`, asks whether the claim
 * (`cursed_dragon_adoption.claim_id`) was made, and claims it with the chosen dragon. One shared instance: the window
 * and the home screen button read the same claim state.
 */
const useCursedDragonAdoptionState = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [claimState, setClaimState] = useState<CursedDragonClaimStateValue>(CursedDragonClaimState.UNKNOWN);
    // The state as the last event left it: a link and a click read it outside a render.
    const claimStateRef = useRef<CursedDragonClaimStateValue>(CursedDragonClaimState.UNKNOWN);
    const claimIdRef = useRef('');
    // The home screen button asked whether the claim is open, outside the window's own fetch.
    const checkingRef = useRef(false);

    const moveTo = useCallback((next: CursedDragonClaimStateValue) => {
        claimStateRef.current = next;
        setClaimState(next);
    }, []);

    const open = useCallback(() => {
        const claimId = resolveCursedDragonClaimId(GetConfigurationValue<string>('cursed_dragon_adoption.claim_id', ''));

        claimIdRef.current = claimId;

        if (shouldFetchCursedDragonClaim(claimStateRef.current)) {
            moveTo(CursedDragonClaimState.FETCHING);
            SendMessageComposer(new GetHasClaimedProductComposer(claimId));
        }

        setIsVisible(true);
    }, [moveTo]);

    const close = useCallback(() => setIsVisible(false), []);

    /** The home screen button's question: is the adoption open for this user? Asked without disturbing the window. */
    const checkAvailability = useCallback(() => {
        if (claimStateRef.current === CursedDragonClaimState.FETCHING || claimStateRef.current === CursedDragonClaimState.CLAIMING) return;

        const claimId = resolveCursedDragonClaimId(GetConfigurationValue<string>('cursed_dragon_adoption.claim_id', ''));

        claimIdRef.current = claimId;
        checkingRef.current = true;
        SendMessageComposer(new GetHasClaimedProductComposer(claimId));
    }, []);

    const makeClaim = useCallback(
        (choice: CursedDragonChoiceValue) => {
            if (claimStateRef.current !== CursedDragonClaimState.AVAILABLE) return;

            moveTo(CursedDragonClaimState.CLAIMING);
            SendMessageComposer(new ClaimFreeProductComposer(claimIdRef.current, choice));
        },
        [moveTo]
    );

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                if (isCursedDragonOpenLink(url)) open();
            },
            eventUrlPrefix: CURSED_DRAGON_LINK_PREFIX
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, [open]);

    useMessageEvent<HasClaimedProductEvent>(HasClaimedProductEvent, (event) => {
        const parser = event.getParser();

        if (checkingRef.current && parser.claimId === claimIdRef.current && claimStateRef.current !== CursedDragonClaimState.FETCHING) {
            checkingRef.current = false;
            moveTo(cursedDragonStateAfterCheck(claimStateRef.current, parser.claimed));

            return;
        }

        if (parser.claimId === claimIdRef.current) checkingRef.current = false;

        moveTo(cursedDragonStateAfterHasClaimed(claimStateRef.current, claimIdRef.current, parser.claimId, parser.claimed));
    });

    useMessageEvent<ClaimProductResultEvent>(ClaimProductResultEvent, (event) => {
        const parser = event.getParser();

        moveTo(cursedDragonStateAfterResult(claimStateRef.current, claimIdRef.current, parser.claimId, parser.result));
    });

    return { isVisible, claimState, canClaim: claimState === CursedDragonClaimState.AVAILABLE, open, close, makeClaim, checkAvailability };
};

export const useCursedDragonAdoption = () => useSharedHook(useCursedDragonAdoptionState);

registerSharedHook(useCursedDragonAdoptionState);
