import {
    DeleteRewardTrackEntityMessageComposer,
    GetRewardTrackAdminDataMessageComposer,
    RewardTrackAdminDataMessageEvent,
    RewardTrackAdminResultMessageEvent,
    RewardTrackAdminTrack,
    RewardTrackFurniMatch,
    RewardTrackFurniSearchResultMessageEvent,
    RewardTrackTaskLevelInput,
    RewardTrackTextInput,
    SaveRewardTrackMessageComposer,
    SaveRewardTrackPrizeMessageComposer,
    SaveRewardTrackTaskMessageComposer,
    SaveRewardTrackTextsMessageComposer,
    SearchRewardTrackFurniMessageComposer
} from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

export type RewardTrackAdminEntity = 'track' | 'task' | 'prize' | 'texts';

export interface RewardTrackFurniSearch {
    query: string;
    matches: RewardTrackFurniMatch[];
}

export interface RewardTrackAdminResult {
    success: boolean;
    message: string;
    entity: string;
    trackId: string;
    id: string;
    /** Grows with every answer so the same message can be shown twice. */
    sequence: number;
}

export interface RewardTrackAdminTrackInput {
    id: string;
    theme: string;
    sortOrder: number;
    startsAt: number;
    endsAt: number;
    hasPremium: boolean;
    /** Hundredths: 150 is 1.5x. */
    premiumBoostPercent: number;
    premiumInstantPoints: number;
    premiumCostDiamonds: number;
    premiumCostCredits: number;
    enabled: boolean;
}

export interface RewardTrackAdminTaskInput {
    trackId: string;
    id: string;
    actionType: string;
    parameter: string;
    premium: boolean;
    sortOrder: number;
    levels: RewardTrackTaskLevelInput[];
}

export interface RewardTrackAdminPrizeInput {
    trackId: string;
    id: string;
    requiredPoints: number;
    productItemTypeId: number;
    rewardType: string;
    extraParams: string;
    rewardAmount: number;
    premium: boolean;
    sortOrder: number;
}

type QueuedComposer = Parameters<typeof SendMessageComposer>[0];

/** The server answers a write before the next one may go; a lost answer frees the queue after this long. */
const WRITE_TIMEOUT_MS = 4000;

/**
 * The staff editor's side of the reward track: every stored track (disabled ones included), the
 * choices the server offers, and the writes. Each successful write makes the server reload the
 * tracks for everyone and send this list again. Writes go one at a time: the server takes at most
 * two a second per client, and a reorder or a duplicate sends several.
 */
export const useRewardTrackAdmin = () => {
    const [tracks, setTracks] = useState<RewardTrackAdminTrack[]>([]);
    const [actionTypes, setActionTypes] = useState<string[]>([]);
    const [rewardTypes, setRewardTypes] = useState<string[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [pending, setPending] = useState(false);
    const [lastResult, setLastResult] = useState<RewardTrackAdminResult>(null);
    const [furniSearch, setFurniSearch] = useState<RewardTrackFurniSearch>(null);
    const queue = useRef<QueuedComposer[]>([]);
    const inFlight = useRef(false);
    const timeout = useRef<ReturnType<typeof setTimeout>>(null);

    const sendNext = useCallback(() => {
        if (timeout.current) clearTimeout(timeout.current);

        const next = queue.current.shift();

        if (!next) {
            inFlight.current = false;
            setPending(false);

            return;
        }

        inFlight.current = true;
        setPending(true);
        SendMessageComposer(next);
        timeout.current = setTimeout(() => sendNext(), WRITE_TIMEOUT_MS);
    }, []);

    const write = useCallback(
        (composer: QueuedComposer) => {
            queue.current.push(composer);

            if (!inFlight.current) sendNext();
        },
        [sendNext]
    );

    useEffect(() => () => timeout.current && clearTimeout(timeout.current), []);

    const requestData = useCallback(() => SendMessageComposer(new GetRewardTrackAdminDataMessageComposer()), []);

    const saveTrack = useCallback(
        (input: RewardTrackAdminTrackInput) =>
            write(
                new SaveRewardTrackMessageComposer(
                    input.id,
                    input.theme,
                    input.sortOrder,
                    input.startsAt,
                    input.endsAt,
                    input.hasPremium,
                    input.premiumBoostPercent,
                    input.premiumInstantPoints,
                    input.premiumCostDiamonds,
                    input.premiumCostCredits,
                    input.enabled
                )
            ),
        [write]
    );

    const saveTask = useCallback(
        (input: RewardTrackAdminTaskInput) =>
            write(new SaveRewardTrackTaskMessageComposer(input.trackId, input.id, input.actionType, input.parameter, input.premium, input.sortOrder, input.levels)),
        [write]
    );

    const savePrize = useCallback(
        (input: RewardTrackAdminPrizeInput) =>
            write(
                new SaveRewardTrackPrizeMessageComposer(
                    input.trackId,
                    input.id,
                    input.requiredPoints,
                    input.productItemTypeId,
                    input.rewardType,
                    input.extraParams,
                    input.rewardAmount,
                    input.premium,
                    input.sortOrder
                )
            ),
        [write]
    );

    const saveTexts = useCallback((trackId: string, texts: RewardTrackTextInput[]) => write(new SaveRewardTrackTextsMessageComposer(trackId, texts)), [write]);

    /** A lookup, outside the write queue: the answer carries the query so a stale one can be told apart. */
    const searchFurni = useCallback((query: string) => SendMessageComposer(new SearchRewardTrackFurniMessageComposer(query)), []);

    const deleteEntity = useCallback((entity: RewardTrackAdminEntity, trackId: string, id: string) => write(new DeleteRewardTrackEntityMessageComposer(entity, trackId, id)), [write]);

    useMessageEvent<RewardTrackAdminDataMessageEvent>(RewardTrackAdminDataMessageEvent, (event) => {
        const parser = event.getParser();

        setActionTypes(parser.actionTypes);
        setRewardTypes(parser.rewardTypes);
        setTracks(parser.tracks);
        setLoaded(true);
    });

    useMessageEvent<RewardTrackFurniSearchResultMessageEvent>(RewardTrackFurniSearchResultMessageEvent, (event) => {
        const parser = event.getParser();

        setFurniSearch({ query: parser.query, matches: parser.matches });
    });

    useMessageEvent<RewardTrackAdminResultMessageEvent>(RewardTrackAdminResultMessageEvent, (event) => {
        const parser = event.getParser();

        setLastResult((previous) => ({
            success: parser.success,
            message: parser.message,
            entity: parser.entity,
            trackId: parser.trackId,
            id: parser.id,
            sequence: (previous?.sequence ?? 0) + 1
        }));

        // A refusal drops what was queued behind it: a duplicate whose track failed must not add orphans.
        if (!parser.success) queue.current = [];

        sendNext();
    });

    return { tracks, actionTypes, rewardTypes, loaded, pending, lastResult, furniSearch, requestData, saveTrack, saveTask, savePrize, saveTexts, deleteEntity, searchFurni };
};
