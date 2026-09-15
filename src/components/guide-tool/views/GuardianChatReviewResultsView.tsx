import { FC } from 'react';
import {
    chatReviewStatusFromVote,
    getChatReviewResultFallback,
    getChatReviewResultKey,
    getChatReviewStatusFallback,
    getChatReviewStatusIcon,
    getChatReviewStatusKey,
    isChatReviewStatusAnimated,
    localizeWithFallback
} from '../../../api';
import { Button, Text } from '../../../common';

interface GuardianChatReviewResultsViewProps {
    /** False while waiting (guardian_chat_review_wait_for_results), true for the verdict (guardian_chat_review_results). */
    final: boolean;
    ownVote: number;
    winningVote: number;
    /** The status of the other jurors (ChatReviewSessionVotingStatus / Results.finalStatus). */
    statuses: number[];
    onClose: () => void;
}

const StatusIcon: FC<{ status: number }> = ({ status }) => (
    <div className={`octane-guardian-decision decision-${getChatReviewStatusIcon(status)}${isChatReviewStatusAnimated(status) ? ' is-animated' : ''}`} />
);

/**
 * guardian_chat_review_wait_for_results / guardian_chat_review_results (248x280): the own
 * vote with the "YOUR VOTE" balloon, the votes of the other guardians (showStatus) and,
 * once the verdict is in, the outcome (setStateGuardianChatReviewResults).
 */
export const GuardianChatReviewResultsView: FC<GuardianChatReviewResultsViewProps> = (props) => {
    const { final = false, ownVote = -1, winningVote = -1, statuses = [], onClose = null } = props;

    const ownStatus = chatReviewStatusFromVote(ownVote);

    return (
        <div className="octane-guardian-results">
            {final ? (
                <div className="octane-guardian-results-verdict">
                    <StatusIcon status={chatReviewStatusFromVote(winningVote)} />
                    <Text bold>{localizeWithFallback(getChatReviewResultKey(winningVote), getChatReviewResultFallback(winningVote))}</Text>
                </div>
            ) : (
                <div className="octane-guardian-results-waiting">
                    <Text bold center className="octane-guardian-results-waiting-title">
                        {localizeWithFallback('guide.bully.request.guide.results.waiting.title', 'Waiting for the votes to roll in...')}
                    </Text>
                    <Text center small wrap>
                        {localizeWithFallback(
                            'guide.bully.request.guide.results.waiting.description',
                            'The verdict will be shown here once enough votes are in.'
                        )}
                    </Text>
                </div>
            )}
            <Text bold className="octane-guardian-results-label">
                {final
                    ? localizeWithFallback('guide.bully.request.guide.results.final.votes', 'THE FINAL VOTES:')
                    : localizeWithFallback('guide.bully.request.guide.results.votes', 'THE VOTES SO FAR:')}
            </Text>
            <div className="octane-guardian-results-list octane-card-panel">
                <div className="octane-guardian-results-row is-own">
                    <Text bold>{localizeWithFallback(getChatReviewStatusKey(ownStatus), getChatReviewStatusFallback(ownStatus))}</Text>
                    <StatusIcon status={ownStatus} />
                    <div className="octane-guardian-results-balloon">{localizeWithFallback('guide.bully.request.guide.results.your_vote', 'YOUR VOTE')}</div>
                </div>
                {statuses.map((status, index) => (
                    <div key={index} className="octane-guardian-results-row">
                        <Text bold>{localizeWithFallback(getChatReviewStatusKey(status), getChatReviewStatusFallback(status))}</Text>
                        <StatusIcon status={status} />
                    </div>
                ))}
            </div>
            <div className="octane-guardian-results-footer">
                <Text bold center wrap>
                    {final
                        ? localizeWithFallback('guide.bully.request.guide.results.thanks', 'Thanks for your vote!')
                        : localizeWithFallback(
                              'guide.bully.request.guide.results.wait',
                              "Thanks for your vote! You can close this window if you don't want to wait for the final result."
                          )}
                </Text>
                <Button variant="primary" onClick={() => onClose && onClose()}>
                    {localizeWithFallback('alert.close.button', 'Close')}
                </Button>
            </div>
        </div>
    );
};
