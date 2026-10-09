import {
    AchievementEvent,
    AchievementResolutionCompletedMessageEvent,
    AchievementResolutionData,
    AchievementResolutionProgressMessageEvent,
    AchievementResolutionsMessageEvent,
    GetResolutionAchievementsMessageComposer,
    ResetResolutionAchievementMessageComposer
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FriendlyTime, LocalizeBadgeDescription, LocalizeBadgeName, localizeWithFallback, SendMessageComposer } from '../../../../api';
import { Button, LayoutBadgeImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useMessageEvent, useNotification } from '../../../../hooks';

type ResolutionView =
    | { kind: 'picker'; stuffId: number; achievements: AchievementResolutionData[]; endsAt: number }
    | { kind: 'progress'; stuffId: number; badgeCode: string; progress: number; total: number; endsAt: number }
    | { kind: 'completed'; badgeCode: string };

const STATE_SELECTABLE = 0;

/** Habbo's New Year resolution windows, opened by clicking a resolution furni. */
export const AchievementResolutionView: FC = () => {
    const [view, setView] = useState<ResolutionView>(null);
    const [selectedId, setSelectedId] = useState(-1);
    const [now, setNow] = useState(() => Date.now());
    const { showConfirm = null } = useNotification();

    useMessageEvent<AchievementResolutionsMessageEvent>(AchievementResolutionsMessageEvent, (event) => {
        const parser = event.getParser();

        // Habbo keeps the picker closed when there is nothing to choose.
        if (!parser || !parser.achievements?.length) return;

        setSelectedId(-1);
        setView({ kind: 'picker', stuffId: parser.stuffId, achievements: parser.achievements, endsAt: Date.now() + parser.endTime * 1000 });
    });

    useMessageEvent<AchievementResolutionProgressMessageEvent>(AchievementResolutionProgressMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setView({
            kind: 'progress',
            stuffId: parser.stuffId,
            badgeCode: parser.requiredLevelBadgeCode,
            progress: parser.userProgress,
            total: parser.totalProgress,
            endsAt: Date.now() + parser.endTime * 1000
        });
    });

    useMessageEvent<AchievementResolutionCompletedMessageEvent>(AchievementResolutionCompletedMessageEvent, (event) => {
        const parser = event.getParser();

        if (parser) setView({ kind: 'completed', badgeCode: parser.badgeCode });
    });

    // An achievement moved on while the progress window is open: ask for fresh numbers.
    useMessageEvent<AchievementEvent>(AchievementEvent, () => {
        if (view?.kind === 'progress') SendMessageComposer(new GetResolutionAchievementsMessageComposer(view.stuffId, 0));
    });

    useEffect(() => {
        if (!view || view.kind === 'completed') return;

        const timer = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(timer);
    }, [view]);

    if (!view) return null;

    const close = () => setView(null);
    const timeLeft = (endsAt: number) => FriendlyTime.format(Math.max(0, Math.floor((endsAt - now) / 1000)));

    if (view.kind === 'completed') {
        return (
            <OctaneCardView className="octane-resolution" theme="primary-slim">
                <OctaneCardHeaderView headerText={localizeWithFallback('resolution.completed.title', 'New Year resolution')} onCloseClick={close} />
                <OctaneCardContentView center gap={2}>
                    <LayoutBadgeImageView badgeCode={view.badgeCode} />
                    <Text bold>{localizeWithFallback('resolution.completed.header', 'Yay, you made it!')}</Text>
                    <Text center small>{localizeWithFallback('resolution.completed.description', '')}</Text>
                    <Button onClick={close}>{localizeWithFallback('resolution.completed.close', 'Close window')}</Button>
                </OctaneCardContentView>
            </OctaneCardView>
        );
    }

    if (view.kind === 'progress') {
        const percent = view.total > 0 ? Math.min(100, Math.round((view.progress / view.total) * 100)) : 0;

        const reset = () =>
            showConfirm(
                `${localizeWithFallback('resolution.reset.confirmation.text', 'Are you sure you want to re-select')} ${LocalizeBadgeName(view.badgeCode)}?`,
                () => {
                    SendMessageComposer(new ResetResolutionAchievementMessageComposer(view.stuffId));
                    SendMessageComposer(new GetResolutionAchievementsMessageComposer(view.stuffId, 0));
                },
                null,
                null,
                null,
                localizeWithFallback('resolution.reset.confirmation.title', 'Reset progress')
            );

        return (
            <OctaneCardView className="octane-resolution" theme="primary-slim">
                <OctaneCardHeaderView headerText={localizeWithFallback('resolution.progress.title', 'New Year resolution')} onCloseClick={close} />
                <OctaneCardContentView gap={2}>
                    <div className="flex items-center gap-2">
                        <LayoutBadgeImageView badgeCode={view.badgeCode} />
                        <div className="min-w-0">
                            <Text bold>{LocalizeBadgeName(view.badgeCode)}</Text>
                            <Text small>{LocalizeBadgeDescription(view.badgeCode)}</Text>
                        </div>
                    </div>
                    <div className="h-[14px] rounded bg-black/20 overflow-hidden">
                        <div className="h-full bg-[#3c8a1e]" style={{ width: `${percent}%` }} />
                    </div>
                    <Text small>
                        {localizeWithFallback('resolution.progress.progress', `Your progress ${view.progress}/${view.total}`, ['progress', 'total'], [view.progress.toString(), view.total.toString()])}
                    </Text>
                    <Text small>
                        {localizeWithFallback('resolution.progress.time.left', 'Time left:')} {timeLeft(view.endsAt)}
                    </Text>
                    <div className="flex justify-between mt-auto">
                        <Button variant="secondary" onClick={reset}>{localizeWithFallback('resolution.progress.reset', 'Re-select achievement')}</Button>
                        <Button onClick={close}>{localizeWithFallback('generic.close', 'Close')}</Button>
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        );
    }

    const selected = view.achievements.find((achievement) => achievement.achievementId === selectedId) ?? null;
    const selectedBadge = selected?.badgeId ?? '';
    const canPick = !!selected && selected.state === STATE_SELECTABLE;

    const pick = () => {
        if (!canPick) return;

        showConfirm(
            localizeWithFallback('resolution.confirmation.text', 'You can\'t change your selection later on.'),
            () => {
                SendMessageComposer(new GetResolutionAchievementsMessageComposer(view.stuffId, selected.achievementId));
                close();
            },
            null,
            null,
            null,
            localizeWithFallback('resolution.confirmation.title', 'Are you sure you want to pick this achievement?')
        );
    };

    return (
        <OctaneCardView className="octane-resolution octane-resolution--picker" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('resolution.title', 'Set yourself a New Year resolution!')} onCloseClick={close} />
            <OctaneCardContentView gap={2} overflow="hidden">
                <Text small>{localizeWithFallback('resolution.header', 'Pick an achievement and see what level you need to reach.')}</Text>
                <div className="grid grid-cols-6 gap-1 overflow-auto max-h-[150px] p-1 rounded bg-black/10">
                    {view.achievements.map((achievement) => (
                        <button
                            key={achievement.achievementId}
                            className={`p-0.5 rounded border-2 bg-transparent cursor-pointer ${achievement.achievementId === selectedId ? 'border-[#1e7295]' : 'border-transparent'} ${achievement.state === STATE_SELECTABLE ? '' : 'opacity-40'}`}
                            title={LocalizeBadgeName(achievement.badgeId)}
                            type="button"
                            onClick={() => setSelectedId(achievement.achievementId)}
                        >
                            <LayoutBadgeImageView badgeCode={achievement.badgeId} />
                        </button>
                    ))}
                </div>
                {selected && (
                    <div className="flex flex-col gap-0.5">
                        <Text bold>{LocalizeBadgeName(selectedBadge)}</Text>
                        <Text small>{LocalizeBadgeDescription(selectedBadge)}</Text>
                        <Text small>
                            {localizeWithFallback('resolution.achievement.level', 'Your current level')}:{' '}
                            {localizeWithFallback('resolution.achievement.level.value', `Level ${selected.level}`, ['level'], [selected.level.toString()])}
                        </Text>
                        {selected.state === STATE_SELECTABLE ? (
                            <Text small bold>
                                {localizeWithFallback('resolution.achievement.target', 'Target level')}:{' '}
                                {localizeWithFallback('resolution.achievement.target.value', `Level ${selected.requiredLevel}`, ['level'], [selected.requiredLevel.toString()])}
                            </Text>
                        ) : (
                            <Text small className="text-[#a81a12]">{localizeWithFallback(`resolution.disabled.${selected.state}`, '')}</Text>
                        )}
                    </div>
                )}
                <Text small variant="muted">
                    {localizeWithFallback('resolution.progress.time.left', 'Time left:')} {timeLeft(view.endsAt)}
                </Text>
                <div className="flex justify-between mt-auto gap-1">
                    <Button variant="secondary" onClick={close}>{localizeWithFallback('resolution.button.cancel', 'No thanks, maybe later!')}</Button>
                    <Button variant="success" disabled={!canPick} onClick={pick}>{localizeWithFallback('resolution.button.ok', 'Make the resolution!')}</Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
