import { FC } from 'react';
import { rewardTrackColorToCss } from '../../api';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useRewardTrackProgressBar } from '../../hooks/quests/useRewardTrackProgressBar';

interface RewardTrackMiniBarProps {
    ratio: number;
    width: number;
    snapKey: string;
    levelIndex?: number;
}

/**
 * A loading_bar of the task rows and levels (RewardTrackTaskProgressBarView): grey track, orange fill that
 * turns green over 300 ms once full, with its gloss. The fill moves with AIR's accelerated mover. The talent
 * track draws its level, task and progress bars with it too.
 */
export const RewardTrackMiniBar: FC<RewardTrackMiniBarProps> = ({ ratio, width, snapKey, levelIndex = -1 }) => {
    const bar = useRewardTrackProgressBar({ ratio, maxWidth: width, animate: true, snapKey, task: true, levelIndex });

    return (
        <NativeTextTree>
            <div className="octane-reward-track-mini-bar" style={{ width }} data-complete={ratio >= 1}>
                <div className="octane-reward-track-mini-bar-progress" style={{ width: bar.width }}>
                    <div className="octane-reward-track-mini-bar-fill" style={{ backgroundColor: rewardTrackColorToCss(bar.color) }} />
                    <div className="octane-reward-track-mini-bar-gloss" />
                </div>
            </div>
        </NativeTextTree>
    );
};
