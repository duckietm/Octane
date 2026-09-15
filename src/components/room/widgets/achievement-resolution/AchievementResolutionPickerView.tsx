import { FC, useState } from 'react';
import { localizeWithFallback } from '../../../../api';
import { Button, Flex, LayoutBadgeImageView, Text } from '../../../../common';
import { IResolutionPicker } from '../../../../hooks';
import { disabledReason, formatTimeLeft, RESOLUTION_ENABLED } from './achievementResolution.helpers';

interface Props {
    picker: IResolutionPicker;
    onSelect: (achievementId: number) => void;
    onClose: () => void;
}

/**
 * "Pick an achievement and see what level you need": the grid of the owner's achievements on the
 * left, the one they are looking at on the right, and the button that makes the promise. An
 * achievement that cannot be promised says why instead of offering the button.
 */
export const AchievementResolutionPickerView: FC<Props> = ({ picker, onSelect, onClose }) => {
    const [selectedId, setSelectedId] = useState<number>(picker.candidates[0]?.achievementId ?? 0);

    const selected = picker.candidates.find((entry) => entry.achievementId === selectedId) ?? null;
    const reason = selected ? disabledReason(selected.state) : '';

    return (
        <Flex column className="gap-2">
            <Text bold variant="white">
                {localizeWithFallback('resolution.header', 'Pick an achievement and see what level you need to reach.')}
            </Text>
            <Flex className="gap-3">
                <Flex className="octane-resolution-grid flex-wrap gap-1 max-h-[132px] overflow-y-auto w-[180px]">
                    {picker.candidates.map((entry) => (
                        <Flex
                            key={entry.achievementId}
                            pointer
                            alignItems="center"
                            justifyContent="center"
                            className={`octane-resolution-cell p-1 rounded ${entry.achievementId === selectedId ? 'bg-[#ffffff26]' : ''}`}
                            onClick={() => setSelectedId(entry.achievementId)}
                        >
                            <LayoutBadgeImageView badgeCode={entry.badgeId} isGrayscale={!entry.enabled} />
                        </Flex>
                    ))}
                </Flex>
                {selected && (
                    <Flex column className="grow gap-1">
                        <LayoutBadgeImageView badgeCode={selected.badgeId} />
                        <Text variant="muted">
                            {localizeWithFallback('resolution.achievement.level', 'Your current level')}: {selected.level}
                        </Text>
                        <Text variant="muted">
                            {localizeWithFallback('resolution.achievement.target', 'Target level')}: {selected.requiredLevel}
                        </Text>
                        {picker.endTime > 0 && (
                            <Text variant="muted">
                                {localizeWithFallback('resolution.progress.time.left', 'Time left:')} {formatTimeLeft(picker.endTime)}
                            </Text>
                        )}
                    </Flex>
                )}
            </Flex>
            <Flex alignItems="center" justifyContent="between" className="gap-2">
                <Text variant="muted" className="octane-resolution-reason">
                    {reason}
                </Text>
                <Flex className="gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        {localizeWithFallback('resolution.button.cancel', 'No thanks, maybe later!')}
                    </Button>
                    {selected && selected.state === RESOLUTION_ENABLED && (
                        <Button variant="primary" onClick={() => onSelect(selected.achievementId)}>
                            {localizeWithFallback('resolution.button.ok', 'Make the resolution!')}
                        </Button>
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
};
