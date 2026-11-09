import { FC } from 'react';
import { getTalentTaskAction, getTalentTaskActionKey, hasTaskProgressDisplay, ITalentTask, localizeWithFallback } from '../../api';
import frankGreeting from '../../assets/images/talent/help_frank_greeting.png';
import { AirModalDialog, LayoutBadgeImageView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { getTalentTaskInstruction, getTalentTaskTitle } from './TalentTrackView';

interface TalentTaskDialogViewProps {
    trackName: string;
    task: ITalentTask;
    onClose: () => void;
    onAction: (task: ITalentTask) => void;
}

/**
 * Official `task_progress_dialog` (378 px, "Your next goal"): the task's badge and instruction, the
 * hint of `talent.track.task.action.<track>.<badge>`, the score so far and the action button.
 */
export const TalentTaskDialogView: FC<TalentTaskDialogViewProps> = ({ trackName, task, onClose, onAction }) => {
    const hint = localizeWithFallback(getTalentTaskActionKey(trackName, task.badgeCode, 'description'), '');
    const link = localizeWithFallback(getTalentTaskActionKey(trackName, task.badgeCode, 'link'), '');
    const hasAction = !!link && getTalentTaskAction(task.badgeCode) !== null;
    const progress = task.totalScore > 0 ? Math.min(1, task.currentScore / task.totalScore) : 0;

    return (
        <NativeTextTree>
            <AirModalDialog
                caption={localizeWithFallback('talent.track.task.progress.dialog.title', 'Your next goal')}
                className="octane-talent-dialog"
                width={378}
                onBackdropClick={onClose}
                onClose={onClose}
            >
                <div className="octane-talent-dialog__box">
                    <div className="octane-talent-dialog__top">
                        <LayoutBadgeImageView badgeCode={task.badgeCode} />
                        <div>
                            <div className="octane-talent-dialog__instruction">{getTalentTaskInstruction(task.badgeCode, task.totalScore)}</div>
                            <div>{getTalentTaskTitle(task.badgeCode)}</div>
                        </div>
                    </div>
                    {hint && (
                        <div className="octane-talent-dialog__hint">
                            <div className="octane-talent-dialog__instruction">{localizeWithFallback('talent.track.task.action.title', 'Need a hint?')}</div>
                            <div>{hint}</div>
                        </div>
                    )}
                </div>
                {hasTaskProgressDisplay(task.badgeCode) && (
                    <div className="octane-talent-dialog__progress">
                        <div className="octane-talent-dialog__bar">
                            <span style={{ width: `${progress * 100}%` }} />
                        </div>
                        <div className="octane-talent-dialog__instruction">
                            {`${localizeWithFallback('talent.track.task.progress.dialog.progress', 'Your progress:')} ${task.currentScore}/${task.totalScore}`}
                        </div>
                    </div>
                )}
                <div className="octane-talent-dialog__buttons">
                    <BaseButton className="octane-habboway__action" type="button" onClick={() => (hasAction ? onAction(task) : onClose())}>
                        {hasAction ? link : localizeWithFallback('talent.track.task.progress.dialog.thanks', 'Thanks, I get it!')}
                    </BaseButton>
                </div>
            </AirModalDialog>
        </NativeTextTree>
    );
};

/** Official `tour_task_progress_dialog`: the guide advertisement task offers a guided tour. */
export const TalentTourDialogView: FC<{ onClose: () => void; onTakeTour: () => void }> = ({ onClose, onTakeTour }) => (
    <NativeTextTree>
        <AirModalDialog
            caption={localizeWithFallback('talent.track.task.progress.dialog.title', 'Your next goal')}
            className="octane-talent-dialog"
            width={378}
            onClose={onClose}
        >
            <div className="octane-talent-dialog__box is-tour">
                <div className="octane-talent-dialog__instruction">{localizeWithFallback('talent.track.progress.tour.header.caption', 'Gran Tourismo')}</div>
                <div>{localizeWithFallback('talent.track.progress.tour.header.body', 'Check out our tours')}</div>
                <div className="octane-talent-dialog__tour">
                    <img alt="" src={frankGreeting} />
                    <div>
                        <div className="octane-talent-dialog__instruction">{localizeWithFallback('talent.track.progress.tour.info.caption', 'How about a personal tour?')}</div>
                        <div>{localizeWithFallback('talent.track.progress.tour.info.body', 'Get a tour, discover the coolest rooms and ask our guides anything.')}</div>
                        <BaseButton className="octane-habboway__action" type="button" onClick={onTakeTour}>
                            {localizeWithFallback('talent.track.progress.tour.accept', 'Ask for a tour')}
                        </BaseButton>
                    </div>
                </div>
            </div>
            <BaseButton className="octane-talent-dialog__decline" type="button" onClick={onClose}>
                {localizeWithFallback('talent.track.progress.tour.decline', 'No thanks, I would rather explore on my own.')}
            </BaseButton>
        </AirModalDialog>
    </NativeTextTree>
);
