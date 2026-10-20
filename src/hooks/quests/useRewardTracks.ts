import {
    ClaimRewardTrackPrizeMessageComposer,
    GetLocalizationManager,
    GetSessionDataManager,
    GetRewardTracksMessageComposer,
    PurchaseRewardTrackPremiumMessageComposer,
    RewardTrackClaimResultMessageEvent,
    RewardTrackData,
    RewardTrackPremiumPurchaseResultMessageEvent,
    RewardTrackProgressMessageEvent,
    RewardTrackTextsMessageEvent,
    RewardTracksMessageEvent,
    SecurityLevel
} from '@octane/renderer';
import { useCallback, useMemo, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { CopyToClipboard, getRewardTrackResultText, localizeWithFallback, NotificationAlertType, NotificationBubbleType, SendMessageComposer } from '../../api';
import FREE_CLAIM_ICON from '../../assets/images/reward-track/free-track.png';
import PREMIUM_CLAIM_ICON from '../../assets/images/reward-track/premium-track.png';
import { useMessageEvent } from '../events';
import { useNotification } from '../notification';

/** RewardTrackController: the active tracks, claims, progress and the premium purchase. */
const useRewardTracksState = () => {
    const [tracks, setTracks] = useState<RewardTrackData[]>([]);
    const [disabled, setDisabled] = useState(false);
    const [reloadCount, setReloadCount] = useState(0);
    const [textsVersion, setTextsVersion] = useState(0);
    // Bumped on every RewardTracksMessageEvent: AIR rebuilds the track views then, so their bars snap.
    const [tracksVersion, setTracksVersion] = useState(0);
    const [pendingPurchase, setPendingPurchase] = useState<string>(null);
    const { showSingleBubble = null, simpleAlert = null } = useNotification();

    const requestTracks = useCallback(() => SendMessageComposer(new GetRewardTracksMessageComposer()), []);

    const claimPrize = useCallback((trackId: string, rewardId: string) => SendMessageComposer(new ClaimRewardTrackPrizeMessageComposer(trackId, rewardId)), []);

    const purchasePremium = useCallback((trackId: string) => {
        setPendingPurchase(trackId);
        SendMessageComposer(new PurchaseRewardTrackPremiumMessageComposer(trackId));
    }, []);

    /**
     * RewardTrackController.copyDebugId(): staff only (`hasSecurity(EMPLOYEE) || hasSecurity(MODERATOR)`,
     * i.e. a security level of 4 or more), copies the id and always confirms with an INFO notification.
     */
    const copyDebugId = useCallback(
        (id: string, key: string, fallback: string) => {
            if (!GetSessionDataManager().hasSecurity(SecurityLevel.EMPLOYEE)) return;

            void CopyToClipboard(id);

            if (showSingleBubble) showSingleBubble(localizeWithFallback(key, fallback), NotificationBubbleType.INFO);
        },
        [showSingleBubble]
    );

    const copyTrackId = useCallback(
        (trackId: string) => copyDebugId(trackId, 'reward_track.debug.copy_track_id.success', 'Track ID copied to the clipboard'),
        [copyDebugId]
    );

    const copyTaskId = useCallback(
        (taskId: string) => copyDebugId(taskId, 'reward_track.debug.copy_task_id.success', 'Task ID copied to the clipboard'),
        [copyDebugId]
    );

    const getTrack = useCallback((trackId: string) => tracks.find((track) => track.id === trackId) ?? null, [tracks]);

    // The staff-written texts of the active tracks arrive right before the tracks and go into the
    // localization manager, so the window reads them like any other key.
    useMessageEvent<RewardTrackTextsMessageEvent>(RewardTrackTextsMessageEvent, (event) => {
        const texts = event.getParser().texts;

        if (!texts.size) return;

        const manager = GetLocalizationManager();

        texts.forEach((value, key) => manager.setValue(key, value));
        setTextsVersion((prevValue) => prevValue + 1);
    });

    useMessageEvent<RewardTracksMessageEvent>(RewardTracksMessageEvent, (event) => {
        const parser = event.getParser();

        setDisabled(parser.disabled);
        setTracks(parser.disabled ? [] : parser.tracks);
        setTracksVersion((prevValue) => prevValue + 1);

        if (parser.reload) setReloadCount((prevValue) => prevValue + 1);
    });

    useMessageEvent<RewardTrackClaimResultMessageEvent>(RewardTrackClaimResultMessageEvent, (event) => {
        const parser = event.getParser();

        setTracks((prevValue) => {
            const track = prevValue.find((existing) => existing.id === parser.trackId);

            if (!track) return prevValue;

            if (parser.resultCode === 0) {
                const prize = track.getPrize(parser.rewardId);

                track.markPrizeClaimed(parser.rewardId);

                if (showSingleBubble) {
                    showSingleBubble(
                        localizeWithFallback('reward_track.claim.notification.success', 'Reward claimed!'),
                        NotificationBubbleType.INFO,
                        prize && prize.premium ? PREMIUM_CLAIM_ICON : FREE_CLAIM_ICON,
                        `reward_track/open/${track.id}`
                    );
                }
            } else if (showSingleBubble) {
                showSingleBubble(
                    getRewardTrackResultText('reward_track.claim.notification.', parser.resultCode, 'The reward could not be claimed.'),
                    NotificationBubbleType.INFO
                );
            }

            return [...prevValue];
        });
    });

    useMessageEvent<RewardTrackProgressMessageEvent>(RewardTrackProgressMessageEvent, (event) => {
        const parser = event.getParser();

        setTracks((prevValue) => {
            const track = prevValue.find((existing) => existing.id === parser.trackId);

            if (!track) return prevValue;

            const task = track.getTask(parser.taskId);

            if (task) task.progressCount = parser.progressCount;

            track.points = parser.points;

            return [...prevValue];
        });
    });

    useMessageEvent<RewardTrackPremiumPurchaseResultMessageEvent>(RewardTrackPremiumPurchaseResultMessageEvent, (event) => {
        const parser = event.getParser();

        setPendingPurchase(null);

        if (parser.resultCode === 0) {
            setTracks((prevValue) => {
                const track = prevValue.find((existing) => existing.id === parser.trackId);

                if (track) track.markPremiumPurchased(parser.points);

                return [...prevValue];
            });

            if (showSingleBubble) {
                showSingleBubble(
                    localizeWithFallback('reward_track.premium.notification.success', 'Premium unlocked!'),
                    NotificationBubbleType.INFO,
                    PREMIUM_CLAIM_ICON,
                    `reward_track/open/${parser.trackId}`
                );
            }

            return;
        }

        if (simpleAlert) {
            simpleAlert(
                getRewardTrackResultText('reward_track.premium.notification.', parser.resultCode, 'The premium purchase failed.'),
                NotificationAlertType.DEFAULT,
                null,
                null,
                localizeWithFallback('reward_track.premium.confirm.title', 'Premium pass')
            );
        }
    });

    const unseenCount = useMemo(() => tracks.reduce((total, track) => total + track.claimablePrizeCount, 0), [tracks]);

    return {
        tracks,
        disabled,
        reloadCount,
        textsVersion,
        tracksVersion,
        pendingPurchase,
        unseenCount,
        getTrack,
        requestTracks,
        claimPrize,
        purchasePremium,
        copyTrackId,
        copyTaskId
    };
};

registerSharedHook(useRewardTracksState);

export const useRewardTracks = () => useSharedHook(useRewardTracksState);
