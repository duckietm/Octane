import { FC } from 'react';
import { getTalentTaskAction, getTalentTaskActionKey, hasTaskProgressDisplay, ITalentTask, localizeWithFallback } from '../../api';
import frankTips from '../../assets/images/reward-track/frank-tips.png';
import frankGreeting from '../../assets/images/talent/help_frank_greeting.png';
import { AirModalDialog, LayoutBadgeImageView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { RewardTrackMiniBar } from '../quests/RewardTrackMiniBar';
import { getTalentTaskInstruction, getTalentTaskRatio, getTalentTaskTitle } from './TalentTrackView';
import { HANDHELD_TOUCH_FRAME_SCALE } from '../../api/handheld/handheldWindowFit';

/** The dialog's bar spans its 354px content (378 frame, 3px frame sides, 9px padding). */
const DIALOG_BAR_WIDTH = 354;

interface TalentTaskDialogViewProps {
    trackName: string;
    task: ITalentTask;
    onClose: () => void;
    onAction: (task: ITalentTask) => void;
}

/**
 * Official `task_progress_dialog` (378 px, "Your next goal"): the task's badge and instruction, the
 * hint of `talent.track.task.action.<track>.<badge>`, the score so far and the action button. Drawn like the
 * reward track's task info: a panel with the task, Frank's tip box, the task bar and a shiny button.
 */
export const TalentTaskDialogView: FC<TalentTaskDialogViewProps> = ({ trackName, task, onClose, onAction }) => {
    const hint = localizeWithFallback(getTalentTaskActionKey(trackName, task.badgeCode, 'description'), '');
    const link = localizeWithFallback(getTalentTaskActionKey(trackName, task.badgeCode, 'link'), '');
    const hasAction = !!link && getTalentTaskAction(task.badgeCode) !== null;

    return (
        <NativeTextTree>
            <AirModalDialog handheldScale={HANDHELD_TOUCH_FRAME_SCALE}
                caption={localizeWithFallback('talent.track.task.progress.dialog.title', 'Your next goal')}
                className="octane-talent-dialog"
                frameStyle={3}
                width={378}
                onBackdropClick={onClose}
                onClose={onClose}
            >
                <div className="octane-talent-dialog__box">
                    <div className="octane-talent-dialog__top">
                        <span className="octane-talent-dialog__badge">
                            <LayoutBadgeImageView badgeCode={task.badgeCode} />
                        </span>
                        <div className="octane-talent-dialog__copy">
                            <div className="octane-talent-dialog__instruction">{getTalentTaskInstruction(task.badgeCode, task.totalScore)}</div>
                            <div className="octane-talent-dialog__name">{getTalentTaskTitle(task.badgeCode)}</div>
                        </div>
                    </div>
                    {hint && (
                        <div className="octane-talent-dialog__hint">
                            <span className="octane-talent-dialog__frank">
                                <img alt="" draggable={false} src={frankTips} />
                            </span>
                            <div className="octane-talent-dialog__hint-copy">
                                <div className="octane-talent-dialog__hint-title">{localizeWithFallback('talent.track.task.action.title', 'Need a hint?')}</div>
                                <div className="octane-talent-dialog__hint-text">{hint}</div>
                            </div>
                        </div>
                    )}
                </div>
                {hasTaskProgressDisplay(task.badgeCode) && (
                    <div className="octane-talent-dialog__progress">
                        <RewardTrackMiniBar ratio={getTalentTaskRatio(task)} snapKey={`${trackName}:${task.id}`} width={DIALOG_BAR_WIDTH} />
                        <div className="octane-talent-dialog__score">
                            {`${localizeWithFallback('talent.track.task.progress.dialog.progress', 'Your progress:')} ${task.currentScore}/${task.totalScore}`}
                        </div>
                    </div>
                )}
                <div className="octane-talent-dialog__buttons">
                    <BaseButton className="octane-talent-button" type="button" onClick={() => (hasAction ? onAction(task) : onClose())}>
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
        <AirModalDialog handheldScale={HANDHELD_TOUCH_FRAME_SCALE}
            caption={localizeWithFallback('talent.track.task.progress.dialog.title', 'Your next goal')}
            className="octane-talent-dialog"
            frameStyle={3}
            width={378}
            onClose={onClose}
        >
            <div className="octane-talent-dialog__box is-tour">
                <div className="octane-talent-dialog__instruction">{localizeWithFallback('talent.track.progress.tour.header.caption', 'Gran Tourismo')}</div>
                <div className="octane-talent-dialog__name">{localizeWithFallback('talent.track.progress.tour.header.body', 'Check out our tours')}</div>
                <div className="octane-talent-dialog__tour">
                    <img alt="" draggable={false} src={frankGreeting} />
                    <div className="octane-talent-dialog__tour-copy">
                        <div className="octane-talent-dialog__hint-title">{localizeWithFallback('talent.track.progress.tour.info.caption', 'How about a personal tour?')}</div>
                        <div className="octane-talent-dialog__hint-text">
                            {localizeWithFallback('talent.track.progress.tour.info.body', 'Get a tour, discover the coolest rooms and ask our guides anything.')}
                        </div>
                        <BaseButton className="octane-talent-button" type="button" onClick={onTakeTour}>
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
