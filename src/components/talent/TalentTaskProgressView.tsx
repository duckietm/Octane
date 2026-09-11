import { CreateLinkEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import {
    GetConfigurationValue,
    GetGroupInformation,
    getTalentTaskActionKey,
    hasTalentTaskProgressDisplay,
    isCitizenshipEnabled,
    isTalentEmailChangeEnabled,
    LocalizeBadgeDescription,
    LocalizeBadgeName,
    LocalizeText,
    localizeWithFallback,
    TALENT_TASK_AVATAR_LOOKS,
    TALENT_TASK_EMAIL,
    TALENT_TASK_GUIDE_GROUP,
    TALENT_TASK_HABBO_WAY,
    TALENT_TASK_ROOM_ENTRY_1,
    TALENT_TASK_ROOM_ENTRY_2,
    TALENT_TASK_SAFETY_QUIZ,
    TALENT_TASK_TOUR_ADVERT,
    TalentTrackTaskLike
} from '../../api';
import { Button, LayoutBadgeImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useHabboWay, useWelcomeTour } from '../../hooks';
import { EMAIL_RESULT_OK, useTalentEmail } from '../../hooks/talent';

interface TalentTaskProgressViewProps {
    trackName: string;
    task: TalentTrackTaskLike;
    onClose: () => void;
    /** closeAndLog: an action link closes the whole talent track before it opens its target. */
    onCloseTrack: () => void;
}

/** The text of a key, or '' when the key has no translation (getLocalization(key, '')). */
const optionalText = (key: string): string => {
    const text = LocalizeText(key);

    return text && text !== key ? text : '';
};

/**
 * task_progress_dialog (378x370, TalentTrackController.createTaskProgressDialog): the badge,
 * the instruction, the "How do I do this?" action with its link and the progress bar. The
 * tour advertisement task opens tour_task_progress_dialog (378x289) instead.
 */
export const TalentTaskProgressView: FC<TalentTaskProgressViewProps> = (props) => {
    const { trackName = '', task = null, onClose = null, onCloseTrack = null } = props;
    const { showHabboWay = null, startSafetyQuiz = null } = useHabboWay();
    const { acceptTour = null } = useWelcomeTour();
    const { email = '', isVerified = false, result = null, requestEmailStatus = null, changeEmail = null, clearEmailResult = null } = useTalentEmail();
    const [emailDraft, setEmailDraft] = useState<string>('');
    const showEmailBlock = !!task && task.badgeCode === TALENT_TASK_EMAIL && isCitizenshipEnabled() && isTalentEmailChangeEnabled();

    // createTaskProgressDialog asks the server for the status as soon as the e-mail task opens.
    useEffect(() => {
        if (showEmailBlock) requestEmailStatus?.();
    }, [showEmailBlock, requestEmailStatus]);

    useEffect(() => setEmailDraft(email ?? ''), [email]);

    if (!task || !task.badgeCode) return null;

    const close = () => onClose && onClose();

    if (task.badgeCode === TALENT_TASK_TOUR_ADVERT) {
        const takeTour = () => {
            onCloseTrack && onCloseTrack();
            close();
            acceptTour && acceptTour();
        };

        const declineTour = () => {
            onCloseTrack && onCloseTrack();
            close();
        };

        return (
            <OctaneCardView className="octane-talent-task-progress octane-talent-tour-task" theme="primary-slim" uniqueKey="talent-task-progress">
                <OctaneCardHeaderView headerText={localizeWithFallback('talent.track.task.progress.dialog.title', 'Your next target')} onCloseClick={close} />
                <OctaneCardContentView className="text-black">
                    <div className="octane-talent-task-panel octane-card-panel octane-talent-tour-panel">
                        <div className="octane-talent-tour-frank" />
                        <div className="octane-talent-tour-header">
                            <Text bold>{localizeWithFallback('talent.track.progress.tour.header.caption', 'Gran Turismo')}</Text>
                            <Text wrap>{localizeWithFallback('talent.track.progress.tour.header.body', 'Check out the guided tours.')}</Text>
                        </div>
                        <hr className="octane-card-divider m-0" />
                        <div className="octane-talent-tour-info">
                            <Text bold>{localizeWithFallback('talent.track.progress.tour.info.caption', 'How about a personal tour?')}</Text>
                            <Text wrap>
                                {localizeWithFallback(
                                    'talent.track.progress.tour.info.body',
                                    'Get a guided tour, see the most awesome rooms, and ask our Tour Guides what Habbo is all about.'
                                )}
                            </Text>
                            <Button variant="primary" onClick={takeTour}>
                                {localizeWithFallback('talent.track.progress.tour.accept', 'Ask for a personal tour')}
                            </Button>
                        </div>
                    </div>
                    <Text center className="octane-talent-link octane-talent-tour-decline" underline onClick={declineTour}>
                        {localizeWithFallback('talent.track.progress.tour.decline', "No thanks, I'd rather explore on my own.")}
                    </Text>
                </OctaneCardContentView>
            </OctaneCardView>
        );
    }

    const citizenship = isCitizenshipEnabled();
    const actionDescription = citizenship ? optionalText(getTalentTaskActionKey(trackName, task.badgeCode, 'description')) : '';
    const actionLink = citizenship ? optionalText(getTalentTaskActionKey(trackName, task.badgeCode, 'link')) : '';
    const hasAction = actionDescription !== '' || actionLink !== '';
    const showProgress = hasTalentTaskProgressDisplay(task.badgeCode);
    const progressPercent = task.totalScore > 0 ? Math.min(100, Math.max(0, (task.currentScore / task.totalScore) * 100)) : 0;

    /** onTaskProgressWindowEvent: the link opens the place where the task is done. */
    const runAction = () => {
        onCloseTrack && onCloseTrack();
        close();

        switch (task.badgeCode) {
            case TALENT_TASK_HABBO_WAY:
                showHabboWay && showHabboWay();
                return;
            case TALENT_TASK_GUIDE_GROUP: {
                const groupId = GetConfigurationValue<number>('guide.help.alpha.groupid', 0);

                if (groupId > 0) GetGroupInformation(groupId);
                return;
            }
            case TALENT_TASK_SAFETY_QUIZ:
                startSafetyQuiz && startSafetyQuiz();
                return;
            case TALENT_TASK_ROOM_ENTRY_1:
            case TALENT_TASK_ROOM_ENTRY_2:
                CreateLinkEvent('navigator/show');
                return;
            case TALENT_TASK_AVATAR_LOOKS:
                CreateLinkEvent('avatar-editor/show');
                return;
        }
    };

    return (
        <OctaneCardView className="octane-talent-task-progress" theme="primary-slim" uniqueKey="talent-task-progress">
            <OctaneCardHeaderView headerText={localizeWithFallback('talent.track.task.progress.dialog.title', 'Your next target')} onCloseClick={close} />
            <OctaneCardContentView className="text-black">
                <div className="octane-talent-task-panel octane-card-panel">
                    <div className="octane-talent-task-head">
                        <LayoutBadgeImageView badgeCode={task.badgeCode} className="octane-talent-task-badge" />
                        <div className="octane-talent-task-head-text">
                            <Text bold className="octane-talent-task-instruction" wrap>
                                {LocalizeBadgeDescription(task.badgeCode)}
                            </Text>
                            <Text wrap>{LocalizeBadgeName(task.badgeCode)}</Text>
                        </div>
                    </div>
                    {hasAction && (
                        <div className="octane-talent-task-action">
                            <hr className="octane-card-divider m-0" />
                            <Text bold>{localizeWithFallback('talent.track.task.action.title', 'How do I do this?')}</Text>
                            {actionDescription !== '' && <Text wrap>{actionDescription}</Text>}
                        </div>
                    )}
                </div>
                {showEmailBlock && (
                    <div className="octane-talent-email-container octane-card-panel">
                        {isVerified && result === null ? (
                            <Text className="octane-talent-email-verified" wrap>
                                {LocalizeText('talent.track.progress.emailverified')}
                            </Text>
                        ) : (
                            <div className="octane-talent-email-unverified">
                                <input
                                    className={`octane-talent-email-input${result !== null && result !== EMAIL_RESULT_OK ? ' is-invalid' : ''}`}
                                    type="email"
                                    value={emailDraft}
                                    onChange={(event) => setEmailDraft(event.target.value)}
                                    onFocus={() => clearEmailResult?.()}
                                />
                                {result !== null && result !== EMAIL_RESULT_OK && (
                                    <Text className="octane-talent-email-error" wrap>
                                        {LocalizeText(`welcome.gift.email.error.${result}`)}
                                    </Text>
                                )}
                                {result === EMAIL_RESULT_OK ? (
                                    <Text className="octane-talent-email-changed" wrap>
                                        {LocalizeText('talent.track.progress.emailchanged')}
                                    </Text>
                                ) : (
                                    <Button variant="primary" onClick={() => changeEmail?.(emailDraft)}>
                                        {LocalizeText('talent.track.progress.setemail')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
                {showProgress && (
                    <div className="octane-talent-task-progress-main">
                        <div className="octane-talent-progress-bar">
                            <div className="octane-talent-progress-bar-achieved" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <Text bold center>
                            {localizeWithFallback('talent.track.task.progress.dialog.progress', 'Your progress:')} {task.currentScore}/{task.totalScore}
                        </Text>
                        {actionLink !== '' && <hr className="octane-card-divider m-0" />}
                    </div>
                )}
                <div className="octane-talent-task-actions">
                    {actionLink !== '' && (
                        <Button variant="primary" onClick={runAction}>
                            {actionLink}
                        </Button>
                    )}
                    <Button variant={actionLink !== '' ? 'secondary' : 'primary'} onClick={close}>
                        {localizeWithFallback('talent.track.task.progress.dialog.thanks', 'Thanks, I got this!')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
