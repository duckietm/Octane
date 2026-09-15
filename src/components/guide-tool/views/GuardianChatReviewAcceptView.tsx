import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { Button, Text } from '../../../common';
import { GuardianChatReviewCountdownView } from './GuardianChatReviewCountdownView';

interface GuardianChatReviewAcceptViewProps {
    acceptanceTimeout: number;
    onAccept: () => void;
    onSkip: () => void;
}

/**
 * guardian_chat_review_accept (282x276): the bully case offered to a guardian, with the
 * countdown of the acceptance timeout, the accept button and the skip link
 * (GuideSessionController.setStateGuardianChatReviewAccept).
 */
export const GuardianChatReviewAcceptView: FC<GuardianChatReviewAcceptViewProps> = (props) => {
    const { acceptanceTimeout = 0, onAccept = null, onSkip = null } = props;

    return (
        <div className="octane-guardian-accept">
            <div className="octane-guardian-accept-illustration">
                <GuardianChatReviewCountdownView seconds={acceptanceTimeout} />
            </div>
            <div className="octane-guardian-accept-request">
                <Text bold>{localizeWithFallback('guide.bully.request.guide.accept.request.title', 'New request')}</Text>
                <Text variant="muted">{localizeWithFallback('guide.bully.request.guide.accept.request.type', 'Bullying case')}</Text>
                <Text className="octane-guardian-accept-description" wrap>
                    {localizeWithFallback(
                        'guide.bully.request.guide.accept.request.description',
                        'The user has reported a case of bullying. Take a look at the anonymous chat log and vote with other fellow Guardians about the case.'
                    )}
                </Text>
            </div>
            <div className="octane-guardian-accept-actions">
                <Button variant="success" onClick={() => onAccept && onAccept()}>
                    {localizeWithFallback('guide.bully.request.guide.accept.accept.button', 'Accept request')}
                </Button>
                <Text center className="octane-guardian-link" underline onClick={() => onSkip && onSkip()}>
                    {localizeWithFallback('guide.bully.request.guide.accept.skip.link', "I can't help with this request")}
                </Text>
            </div>
        </div>
    );
};
