import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';
import { Button, Flex, LayoutBadgeImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useAchievementResolution } from '../../../../hooks';
import { AchievementResolutionPickerView } from './AchievementResolutionPickerView';
import { formatTimeLeft, progressPercent } from './achievementResolution.helpers';

/**
 * The window of a resolution furni, in its three shapes: the picker while the furni carries no
 * promise, the progress while one is open, and the kept-promise card once the level was reached.
 * The renderer sends the open packet on click, so this only ever reacts to what comes back.
 */
export const AchievementResolutionWidgetView: FC<{}> = () => {
    const { resolution, select, reset, close } = useAchievementResolution();

    if (!resolution) return null;

    const title =
        resolution.mode === 'completed'
            ? localizeWithFallback('resolution.completed.title', 'Challenge complete')
            : resolution.mode === 'progress'
              ? localizeWithFallback('resolution.progress.title', 'Your challenge')
              : localizeWithFallback('resolution.title', 'Set yourself a challenge!');

    return (
        <OctaneCardView className="octane-achievement-resolution w-[420px]" theme="primary-slim" uniqueKey="achievement-resolution">
            <OctaneCardHeaderView headerText={title} onCloseClick={close} />
            <OctaneCardContentView className="gap-2">
                {resolution.mode === 'picker' && <AchievementResolutionPickerView picker={resolution} onSelect={select} onClose={close} />}

                {resolution.mode === 'progress' && (
                    <Flex column className="gap-2">
                        <Flex alignItems="center" className="gap-3">
                            <LayoutBadgeImageView badgeCode={resolution.badgeCode} />
                            <Flex column className="grow gap-1">
                                <Text variant="white">
                                    {localizeWithFallback('resolution.progress.progress', 'Your progress')}: {resolution.userProgress}/
                                    {resolution.totalProgress}
                                </Text>
                                <div className="octane-resolution-bar h-2 w-full rounded bg-[#ffffff26]">
                                    <div
                                        className="octane-resolution-bar-fill h-2 rounded bg-[#5dbe3f]"
                                        style={{ width: `${progressPercent(resolution.userProgress, resolution.totalProgress)}%` }}
                                    />
                                </div>
                                <Text variant="muted">
                                    {localizeWithFallback('resolution.progress.time.left', 'Time left:')} {formatTimeLeft(resolution.endTime)}
                                </Text>
                            </Flex>
                        </Flex>
                        <Flex justifyContent="end">
                            <Button variant="secondary" onClick={reset}>
                                {localizeWithFallback('resolution.progress.reset', 'Re-select achievement')}
                            </Button>
                        </Flex>
                    </Flex>
                )}

                {resolution.mode === 'completed' && (
                    <Flex column alignItems="center" className="gap-2">
                        <LayoutBadgeImageView badgeCode={resolution.badgeCode} />
                        <Text bold center variant="white">
                            {localizeWithFallback('resolution.completed.header', 'Yay, you made it!')}
                        </Text>
                        <Text center variant="muted">
                            {localizeWithFallback('resolution.completed.description', 'You kept your resolution.')}
                        </Text>
                        <Button variant="primary" onClick={close}>
                            {localizeWithFallback('resolution.completed.close', 'Close window')}
                        </Button>
                    </Flex>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
