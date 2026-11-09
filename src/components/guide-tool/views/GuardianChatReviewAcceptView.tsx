import { FC } from 'react';
import { guardianText } from '../../../api';
import acceptIcon from '../../../assets/images/guide-tool/chat-review/accept-icon.png';
import perpetratorImage from '../../../assets/images/guide-tool/chat-review/perpetrator.png';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { GuardianCountdownView } from './GuardianCountdownView';

interface GuardianChatReviewAcceptViewProps {
    countdownSeconds: number;
    countdownId: number;
    onAccept: () => void;
    onSkip: () => void;
}

/** AIR guardian_chat_review_accept: a bully report is offered, accept it or skip it before the countdown ends. */
export const GuardianChatReviewAcceptView: FC<GuardianChatReviewAcceptViewProps> = ({ countdownSeconds, countdownId, onAccept, onSkip }) => (
    <NativeTextTree>
        <div className="octane-guardian-accept">
            <div className="octane-guardian-accept__countdown">
                <GuardianCountdownView countdownId={countdownId} seconds={countdownSeconds} />
            </div>
            <img alt="" className="octane-guardian-accept__perpetrator" draggable={false} src={perpetratorImage} />
            <div className="octane-guardian-accept__body">
                <div className="octane-guardian-accept__title">{guardianText('guide.bully.request.guide.accept.request.title')}</div>
                <div className="octane-guardian-accept__type">{guardianText('guide.bully.request.guide.accept.request.type')}</div>
                <div className="octane-guardian-accept__description">{guardianText('guide.bully.request.guide.accept.request.description')}</div>
            </div>
            <BaseButton className="octane-guardian-accept__button" onClick={onAccept}>
                <img alt="" draggable={false} src={acceptIcon} />
                <span>{guardianText('guide.bully.request.guide.accept.accept.button')}</span>
            </BaseButton>
            <BaseButton className="octane-guardian-link octane-guardian-accept__skip" onClick={onSkip}>
                {guardianText('guide.bully.request.guide.accept.skip.link')}
            </BaseButton>
        </div>
    </NativeTextTree>
);
