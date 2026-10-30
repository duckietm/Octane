import { FC } from 'react';
import { guardianResultText, guardianStatusIcon, guardianStatusText, guardianText, isAnimatedStatus, statusFromVote } from '../../../api';
import decisionBad from '../../../assets/images/guide-tool/chat-review/decision-bad.png';
import decisionOk from '../../../assets/images/guide-tool/chat-review/decision-ok.png';
import decisionRefused from '../../../assets/images/guide-tool/chat-review/decision-refused.png';
import decisionSearching1 from '../../../assets/images/guide-tool/chat-review/decision-searching-1.png';
import decisionSearching2 from '../../../assets/images/guide-tool/chat-review/decision-searching-2.png';
import decisionVeryBad from '../../../assets/images/guide-tool/chat-review/decision-very-bad.png';
import decisionWaiting1 from '../../../assets/images/guide-tool/chat-review/decision-waiting-1.png';
import decisionWaiting2 from '../../../assets/images/guide-tool/chat-review/decision-waiting-2.png';
import { Button } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { GuardianAnimatedIcon } from './GuardianAnimatedIcon';

/** help_chat_review_decision_<status>, the animated ones with their two frames. */
const STATUS_FRAMES: Record<string, string[]> = {
    waiting: [decisionWaiting1, decisionWaiting2],
    ok: [decisionOk],
    bad: [decisionBad],
    'very-bad': [decisionVeryBad],
    refused: [decisionRefused],
    searching: [decisionSearching1, decisionSearching2]
};

const StatusIcon: FC<{ status: number }> = ({ status }) => {
    const frames = STATUS_FRAMES[guardianStatusIcon(status)] ?? STATUS_FRAMES.waiting;

    return <GuardianAnimatedIcon className="octane-guardian-results__icon" frames={isAnimatedStatus(status) ? frames : frames.slice(0, 1)} />;
};

interface GuardianChatReviewResultsViewProps {
    /** False while waiting for the other votes, true for the final verdict. */
    final: boolean;
    ownVote: number;
    statuses: number[];
    winningVote: number;
    onClose: () => void;
}

/**
 * AIR guardian_chat_review_wait_for_results and guardian_chat_review_results: the guardian's own
 * vote (with the "YOUR VOTE" balloon), the other guardians' votes as they come in, and at the end
 * the verdict.
 */
export const GuardianChatReviewResultsView: FC<GuardianChatReviewResultsViewProps> = ({ final, ownVote, statuses, winningVote, onClose }) => {
    const ownStatus = statusFromVote(ownVote);
    const resultStatus = statusFromVote(winningVote);

    return (
        <NativeTextTree>
            <div className="octane-guardian-results">
                {final ? (
                    <div className="octane-guardian-results__verdict">
                        <StatusIcon status={resultStatus} />
                        <span>{guardianResultText(resultStatus)}</span>
                    </div>
                ) : (
                    <div className="octane-guardian-results__waiting">
                        <div className="octane-guardian-results__waiting-title">{guardianText('guide.bully.request.guide.results.waiting.title')}</div>
                        <div>{guardianText('guide.bully.request.guide.results.waiting.description')}</div>
                    </div>
                )}
                <div className="octane-guardian-results__heading">
                    {guardianText(final ? 'guide.bully.request.guide.results.final.votes' : 'guide.bully.request.guide.results.votes')}
                </div>
                <div className="octane-guardian-results__list">
                    <div className="octane-guardian-results__row is-own">
                        <span>{guardianStatusText(ownStatus)}</span>
                        <StatusIcon status={ownStatus} />
                        <span className="octane-guardian-results__balloon">{guardianText('guide.bully.request.guide.results.your_vote')}</span>
                    </div>
                    {statuses.map((status, index) => (
                        <div key={index} className="octane-guardian-results__row">
                            <span>{guardianStatusText(status)}</span>
                            <StatusIcon status={status} />
                        </div>
                    ))}
                </div>
                <div className="octane-guardian-results__footer">
                    <div className={final ? 'font-bold' : ''}>
                        {guardianText(final ? 'guide.bully.request.guide.results.thanks' : 'guide.bully.request.guide.results.wait')}
                    </div>
                    <Button onClick={onClose}>{guardianText('alert.close.button')}</Button>
                </div>
            </div>
        </NativeTextTree>
    );
};
