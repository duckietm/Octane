import {
    AvatarScaleType,
    AvatarSetType,
    GetAvatarRenderManager,
    TreasureHuntFailMessageEvent,
    TreasureHuntFirstWinnerMessageEvent,
    TreasureHuntUpdateMessageEvent,
    TreasureHuntWinnerInfo
} from '@octane/renderer';
import { useCallback, useEffect, useRef } from 'react';
import { getTreasureHuntFailText, getTreasureHuntUpdateText, getTreasureHuntWinnerText, LocalizeText, NotificationBubbleType } from '../../api';
import { useMessageEvent } from '../events';
import { useNotification } from './useNotification';

/** How long the winner bubble waits for the avatar parts before it shows without the head. */
const WINNER_HEAD_WAIT_MS = 5000;

/**
 * The treasure hunt part of the official notifications controller (AIR 15): TreasureHuntUpdate,
 * TreasureHuntFail and TreasureHuntFirstWinner each become a `treasure_hunt` styled notification.
 * The first-winner bubble carries the winner's head; like the official `avatarImageReady` path it
 * waits for the figure parts when the head is still a placeholder.
 */
export const useTreasureHuntNotifications = () => {
    const { showSingleBubble = null } = useNotification();
    const pendingWinner = useRef<{ cancel: () => void }>(null);

    const showBubble = useCallback(
        (text: string, imageUrl: string = null) => {
            if (!text || !showSingleBubble) return;

            showSingleBubble(text, NotificationBubbleType.TREASURE_HUNT, imageUrl);
        },
        [showSingleBubble]
    );

    const showWinner = useCallback(
        (info: TreasureHuntWinnerInfo) => {
            pendingWinner.current?.cancel();
            pendingWinner.current = null;

            const text = getTreasureHuntWinnerText(info.userName, info.huntId, LocalizeText);
            let done = false;
            let timeout = 0;

            const finish = (imageUrl: string) => {
                if (done) return;

                done = true;
                window.clearTimeout(timeout);
                pendingWinner.current = null;
                showBubble(text, imageUrl);
            };

            const render = (ready: boolean) => {
                if (done) return;

                const avatar = GetAvatarRenderManager()?.createAvatarImage(info.userFigure, AvatarScaleType.LARGE, info.userGender, {
                    resetFigure: () => render(true),
                    dispose: () => {},
                    disposed: false
                });

                if (!avatar) {
                    finish(null);

                    return;
                }

                try {
                    if (!ready && avatar.isPlaceholder()) return;

                    finish(avatar.processAsCroppedImageUrl(AvatarSetType.HEAD, true));
                } finally {
                    avatar.dispose();
                }
            };

            timeout = window.setTimeout(() => finish(null), WINNER_HEAD_WAIT_MS);
            pendingWinner.current = {
                cancel: () => {
                    done = true;
                    window.clearTimeout(timeout);
                }
            };

            render(false);
        },
        [showBubble]
    );

    useEffect(() => () => pendingWinner.current?.cancel(), []);

    useMessageEvent<TreasureHuntUpdateMessageEvent>(TreasureHuntUpdateMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser || parser.huntId == null) return;

        showBubble(getTreasureHuntUpdateText(parser.huntId, parser.stepsCompleted, parser.totalSteps, parser.isCompleted, LocalizeText));
    });

    useMessageEvent<TreasureHuntFailMessageEvent>(TreasureHuntFailMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        showBubble(getTreasureHuntFailText(parser.requiredLevel, parser.requiredLevelPaying, LocalizeText));
    });

    useMessageEvent<TreasureHuntFirstWinnerMessageEvent>(TreasureHuntFirstWinnerMessageEvent, (event) => {
        const info = event.getParser()?.winnerInfo;

        if (info) showWinner(info);
    });
};
