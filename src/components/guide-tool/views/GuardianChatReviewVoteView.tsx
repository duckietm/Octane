import { FC, useEffect, useState } from 'react';
import { FriendlyTime, GUARDIAN_VOTE_BAD, GUARDIAN_VOTE_OK, GUARDIAN_VOTE_VERY_BAD, guardianText, IChatReviewRecord, secondsSinceIncident } from '../../../api';
import avatarAnonymous from '../../../assets/images/guide-tool/chat-review/avatar-anonymous.png';
import avatarPerpetrator from '../../../assets/images/guide-tool/chat-review/avatar-perpetrator.png';
import progress1 from '../../../assets/images/guide-tool/chat-review/progress-big-1.png';
import progress2 from '../../../assets/images/guide-tool/chat-review/progress-big-2.png';
import progress3 from '../../../assets/images/guide-tool/chat-review/progress-big-3.png';
import progress4 from '../../../assets/images/guide-tool/chat-review/progress-big-4.png';
import voteBad from '../../../assets/images/guide-tool/chat-review/vote-bad.png';
import voteBadDown from '../../../assets/images/guide-tool/chat-review/vote-bad-down.png';
import voteBadOver from '../../../assets/images/guide-tool/chat-review/vote-bad-over.png';
import voteOk from '../../../assets/images/guide-tool/chat-review/vote-ok.png';
import voteOkDown from '../../../assets/images/guide-tool/chat-review/vote-ok-down.png';
import voteOkOver from '../../../assets/images/guide-tool/chat-review/vote-ok-over.png';
import voteVeryBad from '../../../assets/images/guide-tool/chat-review/vote-very-bad.png';
import voteVeryBadDown from '../../../assets/images/guide-tool/chat-review/vote-very-bad-down.png';
import voteVeryBadOver from '../../../assets/images/guide-tool/chat-review/vote-very-bad-over.png';
import { Hint } from '../../../common/Tooltip';
import { BaseButton } from '../../../common/BaseButton';
import { GuardianAnimatedIcon } from './GuardianAnimatedIcon';
import { GuardianCountdownView } from './GuardianCountdownView';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

const PROGRESS_FRAMES = [progress1, progress2, progress3, progress4];

const VOTES = [
    { code: GUARDIAN_VOTE_OK, key: 'ok', images: [voteOk, voteOkOver, voteOkDown] },
    { code: GUARDIAN_VOTE_BAD, key: 'bad', images: [voteBad, voteBadOver, voteBadDown] },
    { code: GUARDIAN_VOTE_VERY_BAD, key: 'very_bad', images: [voteVeryBad, voteVeryBadOver, voteVeryBadDown] }
];

interface GuardianVoteButtonProps {
    images: string[];
    label: string;
    tooltip: string;
    disabled: boolean;
    onVote: () => void;
}

/** One of the three vote regions: the picture follows hover and press like the AIR region does. */
const GuardianVoteButton: FC<GuardianVoteButtonProps> = ({ images, label, tooltip, disabled, onVote }) => {
    const [over, setOver] = useState(false);
    const [down, setDown] = useState(false);

    const image = !disabled && down && over ? images[2] : !disabled && over ? images[1] : images[0];

    return (
        <NativeTextTree>
            <div className="octane-guardian-vote__choice">
                <Hint content={tooltip} delay={0} disabled={disabled}>
                    <BaseButton
                        aria-label={label}
                        className="octane-guardian-vote__button"
                        disabled={disabled}
                        onClick={onVote}
                        onMouseDown={() => setDown(true)}
                        onMouseEnter={() => setOver(true)}
                        onMouseLeave={() => {
                            setOver(false);
                            setDown(false);
                        }}
                        onMouseUp={() => setDown(false)}
                    >
                        <img alt="" draggable={false} src={image} />
                    </BaseButton>
                </Hint>
                <div className="octane-guardian-vote__label">{label}</div>
            </div>
        </NativeTextTree>
    );
};

interface GuardianChatReviewVoteViewProps {
    /** True while waiting for the other guardians (no log yet, the vote is not open). */
    waiting: boolean;
    record: IChatReviewRecord | null;
    countdownSeconds: number;
    countdownId: number;
    onVote: (code: number) => void;
    onClose: () => void;
}

/**
 * AIR guardian_chat_review_vote and guardian_chat_review_wait_for_voters: the anonymous chat log of
 * the incident (the reported user as "SUSPECT", everyone else as "USER n"), how long ago it was,
 * the three votes and the "I can't decide" link.
 */
export const GuardianChatReviewVoteView: FC<GuardianChatReviewVoteViewProps> = ({ waiting, record, countdownSeconds, countdownId, onVote, onClose }) => {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => setNow(Date.now()), 10000);

        return () => window.clearInterval(interval);
    }, []);

    const incidentTime = waiting || !record ? null : `(${FriendlyTime.format(secondsSinceIncident(record.incidentTime, now), '.ago')})`;

    return (
        <NativeTextTree>
            <div className="octane-guardian-vote">
                <div className="octane-guardian-vote__countdown">
                    <GuardianCountdownView countdownId={countdownId} seconds={countdownSeconds} />
                </div>
                <div className="octane-guardian-vote__subtitle">
                    <span>{guardianText('guide.bully.request.guide.vote.subtitle')}</span>
                    {incidentTime && <span className="octane-guardian-vote__time">{incidentTime}</span>}
                </div>
                <div className="octane-guardian-vote__log">
                    {waiting && (
                        <div className="octane-guardian-vote__waiting">
                            <div>{guardianText('guide.bully.request.guide.vote.waiting')}</div>
                            <GuardianAnimatedIcon frames={PROGRESS_FRAMES} />
                        </div>
                    )}
                    {!waiting &&
                        record?.lines.map((line, index) => {
                            const isSuspect = line.userIndex === 0;
                            const name = isSuspect
                                ? guardianText('guide.bully.request.guide.vote.perpetrator')
                                : guardianText('guide.bully.request.guide.vote.anonymous', ['id'], [String(line.userIndex)]);

                            return (
                                <div key={index} className={`octane-guardian-vote__line${isSuspect ? ' is-suspect' : ''}`}>
                                    <img alt="" draggable={false} src={isSuspect ? avatarPerpetrator : avatarAnonymous} />
                                    <div className="octane-guardian-vote__message">
                                        <b>{name}:</b> {line.messages.join('\n')}
                                    </div>
                                </div>
                            );
                        })}
                </div>
                <div className={`octane-guardian-vote__panel${waiting ? ' is-waiting' : ''}`}>
                    <div className="octane-guardian-vote__question">{guardianText('guide.bully.request.guide.vote.question')}</div>
                    <div className="octane-guardian-vote__choices">
                        {VOTES.map((vote) => (
                            <GuardianVoteButton
                                key={vote.key}
                                disabled={waiting}
                                images={vote.images}
                                label={guardianText(`guide.bully.request.guide.vote.${vote.key}`)}
                                tooltip={guardianText(`guide.bully.request.guide.vote.${vote.key}.tooltip`)}
                                onVote={() => onVote(vote.code)}
                            />
                        ))}
                    </div>
                    <hr className="octane-guardian-separator" />
                    <BaseButton className="octane-guardian-link octane-guardian-vote__close" onClick={onClose}>
                        {guardianText('guide.bully.request.guide.vote.close')}
                    </BaseButton>
                </div>
            </div>
        </NativeTextTree>
    );
};
