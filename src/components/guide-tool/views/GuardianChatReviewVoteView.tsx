import { FC, useMemo } from 'react';
import { CHAT_REVIEW_VOTE_BAD, CHAT_REVIEW_VOTE_OK, CHAT_REVIEW_VOTE_VERY_BAD, FriendlyTime, localizeWithFallback, parseChatReviewRecord } from '../../../api';
import { Text } from '../../../common';
import { GuardianChatReviewCountdownView } from './GuardianChatReviewCountdownView';

interface GuardianChatReviewVoteViewProps {
    /** True while the other guardians are still joining (guardian_chat_review_wait_for_voters). */
    waitingForVoters: boolean;
    votingTimeout: number;
    chatRecord: string;
    onVote: (vote: number) => void;
    onClose: () => void;
}

const VOTES = [
    { vote: CHAT_REVIEW_VOTE_OK, key: 'ok', label: 'OK', tooltip: 'Maybe just a little rude or foul-mouthed' },
    { vote: CHAT_REVIEW_VOTE_BAD, key: 'bad', label: 'BULLYING', tooltip: "Very mean and nasty - that's uncalled for!" },
    { vote: CHAT_REVIEW_VOTE_VERY_BAD, key: 'very_bad', label: 'SEVERE', tooltip: 'Worse than bullying - let us know right away!' }
];

/**
 * guardian_chat_review_vote / guardian_chat_review_wait_for_voters (279x499): the countdown,
 * the anonymised chat log of the incident and the three votes
 * (GuideSessionController.setStateGuardianChatReviewVote / WaitForOtherVoters).
 */
export const GuardianChatReviewVoteView: FC<GuardianChatReviewVoteViewProps> = (props) => {
    const { waitingForVoters = false, votingTimeout = 0, chatRecord = '', onVote = null, onClose = null } = props;

    const record = useMemo(() => parseChatReviewRecord(chatRecord), [chatRecord]);

    const suspectLabel = localizeWithFallback('guide.bully.request.guide.vote.perpetrator', 'SUSPECT');

    return (
        <div className="octane-guardian-vote">
            <div className="octane-guardian-vote-top">
                <div className="octane-guardian-vote-subtitle">
                    <Text bold>{localizeWithFallback('guide.bully.request.guide.vote.subtitle', 'THE INCIDENT')}</Text>
                    {!waitingForVoters && <Text small>({FriendlyTime.format(record.incidentAgeSeconds, '.ago')})</Text>}
                </div>
                <GuardianChatReviewCountdownView running={!waitingForVoters} seconds={votingTimeout} />
            </div>
            <div className="octane-guardian-chatlog octane-card-panel">
                {waitingForVoters ? (
                    <div className="octane-guardian-waiting">
                        <Text bold center wrap>
                            {localizeWithFallback('guide.bully.request.guide.vote.waiting', 'Waiting for other Guardians to join the case...')}
                        </Text>
                        <div className="octane-guardian-waiting-animation" />
                    </div>
                ) : (
                    record.entries.map((entry, index) => (
                        <div key={index} className={`octane-guardian-chatlog-entry ${entry.isSuspect ? 'is-suspect' : 'is-anonymous'}`}>
                            <div className="octane-guardian-chatlog-avatar" />
                            <div className="octane-guardian-chatlog-message">
                                <b>
                                    {entry.isSuspect
                                        ? suspectLabel
                                        : localizeWithFallback('guide.bully.request.guide.vote.anonymous', 'USER %ID%', ['ID'], [entry.userIndex.toString()])}
                                    :
                                </b>{' '}
                                {entry.lines.map((line, lineIndex) => (
                                    <span key={lineIndex}>
                                        {lineIndex > 0 && <br />}
                                        {line}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="octane-guardian-vote-panel">
                <Text bold center>
                    {localizeWithFallback('guide.bully.request.guide.vote.question', 'How do you think the suspect behaved?')}
                </Text>
                <div className="octane-guardian-vote-options">
                    {VOTES.map((option) => (
                        <div key={option.key} className="octane-guardian-vote-option">
                            <button
                                aria-label={localizeWithFallback(`guide.bully.request.guide.vote.${option.key}`, option.label)}
                                className={`octane-guardian-vote-button vote-${option.key}`}
                                disabled={waitingForVoters}
                                title={localizeWithFallback(`guide.bully.request.guide.vote.${option.key}.tooltip`, option.tooltip)}
                                type="button"
                                onClick={() => !waitingForVoters && onVote && onVote(option.vote)}
                            />
                            <Text center small>
                                {localizeWithFallback(`guide.bully.request.guide.vote.${option.key}`, option.label)}
                            </Text>
                        </div>
                    ))}
                </div>
                <hr className="octane-card-divider m-0" />
                <Text center className="octane-guardian-link" underline onClick={() => onClose && onClose()}>
                    {localizeWithFallback('guide.bully.request.guide.vote.close', "I can't decide based on this chat log")}
                </Text>
            </div>
        </div>
    );
};
