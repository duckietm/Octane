import {
    AchievementResolutionCompletedMessageEvent,
    AchievementResolutionProgressMessageEvent,
    AchievementResolutionsMessageEvent,
    GetResolutionAchievementsMessageComposer,
    ResetResolutionAchievementMessageComposer
} from '@octane/renderer';
import { useState } from 'react';
import { SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../events';

/** One achievement the furni offers; `state` says why it cannot be picked. */
export interface IResolutionCandidate {
    achievementId: number;
    level: number;
    badgeId: string;
    requiredLevel: number;
    state: number;
    enabled: boolean;
}

export interface IResolutionPicker {
    mode: 'picker';
    stuffId: number;
    candidates: IResolutionCandidate[];
    endTime: number;
}

export interface IResolutionProgress {
    mode: 'progress';
    stuffId: number;
    achievementId: number;
    badgeCode: string;
    userProgress: number;
    totalProgress: number;
    endTime: number;
}

export interface IResolutionCompleted {
    mode: 'completed';
    stuffCode: string;
    badgeCode: string;
}

export type ResolutionState = IResolutionPicker | IResolutionProgress | IResolutionCompleted;

/**
 * The resolution furni: the owner picks one of their achievements and promises to reach its next
 * level before the clock runs out. The renderer already sends the open packet when the furni is
 * clicked, so this hook only has to show what comes back and send the three answers.
 */
export const useAchievementResolution = () => {
    const [resolution, setResolution] = useState<ResolutionState>(null);

    const close = () => setResolution(null);

    /** The furni the window is about, or zero once it shows a kept promise. */
    const stuffId = resolution && resolution.mode !== 'completed' ? resolution.stuffId : 0;

    const select = (achievementId: number) => {
        if (!stuffId || !achievementId) return;

        SendMessageComposer(new GetResolutionAchievementsMessageComposer(stuffId, achievementId));
    };

    // The official window resets and then asks again, so the furni comes back with its picker.
    const reset = () => {
        if (!stuffId) return;

        SendMessageComposer(new ResetResolutionAchievementMessageComposer(stuffId));
        SendMessageComposer(new GetResolutionAchievementsMessageComposer(stuffId, 0));
    };

    useMessageEvent<AchievementResolutionsMessageEvent>(AchievementResolutionsMessageEvent, (event) => {
        const parser = event.getParser();

        setResolution({
            mode: 'picker',
            stuffId: parser.stuffId,
            endTime: parser.endTime,
            candidates: (parser.achievements ?? []).map((entry) => ({
                achievementId: entry.achievementId,
                level: entry.level,
                badgeId: entry.badgeId,
                requiredLevel: entry.requiredLevel,
                state: entry.state,
                enabled: entry.enabled
            }))
        });
    });

    useMessageEvent<AchievementResolutionProgressMessageEvent>(AchievementResolutionProgressMessageEvent, (event) => {
        const parser = event.getParser();

        setResolution({
            mode: 'progress',
            stuffId: parser.stuffId,
            achievementId: parser.achievementId,
            badgeCode: parser.requiredLevelBadgeCode,
            userProgress: parser.userProgress,
            totalProgress: parser.totalProgress,
            endTime: parser.endTime
        });
    });

    useMessageEvent<AchievementResolutionCompletedMessageEvent>(AchievementResolutionCompletedMessageEvent, (event) => {
        const parser = event.getParser();

        setResolution({ mode: 'completed', stuffCode: parser.stuffCode, badgeCode: parser.badgeCode });
    });

    return { resolution, select, reset, close };
};
