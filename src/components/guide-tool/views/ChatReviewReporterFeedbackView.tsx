import { GuideTicketCreationResultMessageEvent, GuideTicketResolutionMessageEvent } from '@octane/renderer';
import { FC, useState } from 'react';
import {
    GetConfigurationValue,
    getChatReviewCreationCode,
    getChatReviewReporterTextKeys,
    getChatReviewResolutionCode,
    LocalizeText,
    localizeWithFallback
} from '../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useMessageEvent } from '../../../hooks';

const FALLBACKS: Record<string, string> = {
    'sent.caption': 'Your report has been sent.',
    'sent.body':
        'The Guardians have received your report, and it now being reviewed. You will receive a separate confirmation when the case has been resolved.',
    'valid.caption': 'Thank you!',
    'valid.body': 'Your report has been reviewed, and an appropriate action has been taken. Thanks for helping keep Habbo safe and friendly!',
    'invalid.caption': "Please don't misuse the bully report system.",
    'invalid.body': 'Misusing the bully reporting system is punishable, and will result in you temporarily losing the ability to report new cases.',
    'blocked.caption': 'You are no longer able to send in new reports.',
    'blocked.body': 'Your reports have been deemed as invalid continuously by the guardians, you are unable to send bully reports for a short while.',
    'nochat.caption': 'Oops!',
    'nochat.body': "The Guardians can't vote on your case, because the user you reported has not spoken.",
    'alreadyreported.caption': 'Oops!',
    'alreadyreported.body': 'Someone has already reported the Habbo, and the Guardians are reviewing the case.',
    note: 'Did you know, that you can also ignore a user by highlighting them and clicking Moderate -> Ignore?'
};

/** The first of the two keys that has a text; the shared `<part>` key otherwise. */
const resolveText = (code: string, part: string): string => {
    const [specific, shared] = getChatReviewReporterTextKeys(code, part);
    const specificText = LocalizeText(specific);

    if (specificText && specificText !== specific) return specificText;

    return localizeWithFallback(shared, FALLBACKS[`${code}.${part}`] ?? FALLBACKS[part] ?? '');
};

/**
 * chat_review_reporter_feedback (369x304): the feedback the reporter of a bully case gets when the
 * ticket is created (GuideTicketCreationResult) and when the guardians resolve it
 * (GuideTicketResolution) - ChatReviewReporterFeedbackCtrl.as.
 */
export const ChatReviewReporterFeedbackView: FC<{}> = () => {
    const [code, setCode] = useState<string>(null);

    const enabled = GetConfigurationValue<boolean>('chatreviewreporterfeedbackctrl.enabled', true);

    useMessageEvent<GuideTicketCreationResultMessageEvent>(GuideTicketCreationResultMessageEvent, (event) => {
        if (!enabled) return;

        setCode(getChatReviewCreationCode(event.getParser().result));
    });

    useMessageEvent<GuideTicketResolutionMessageEvent>(GuideTicketResolutionMessageEvent, (event) => {
        if (!enabled) return;

        setCode(getChatReviewResolutionCode(event.getParser().resolution));
    });

    if (!code) return null;

    const body = resolveText(code, 'body');

    return (
        <OctaneCardView className="octane-chat-review-reporter-feedback" theme="primary-slim" uniqueKey="chat-review-reporter-feedback">
            <OctaneCardHeaderView
                headerText={localizeWithFallback('guide.bully.request.reporter.title', 'Your bully report')}
                onCloseClick={() => setCode(null)}
            />
            <OctaneCardContentView className="text-black">
                <div className="octane-chat-review-reporter-feedback-content">
                    <div className="octane-chat-review-reporter-feedback-text">
                        <Text bold className="octane-chat-review-reporter-feedback-caption" wrap>
                            {resolveText(code, 'caption')}
                        </Text>
                        <div className="octane-chat-review-reporter-feedback-body" dangerouslySetInnerHTML={{ __html: body }} />
                    </div>
                    <div className="octane-chat-review-reporter-feedback-illustration" />
                </div>
                <div className="octane-chat-review-reporter-feedback-note octane-card-panel">
                    <div className="octane-chat-review-reporter-feedback-note-icon" />
                    <Text small wrap>
                        {resolveText(code, 'note')}
                    </Text>
                </div>
                <div className="octane-chat-review-reporter-feedback-actions">
                    <Button variant="primary" onClick={() => setCode(null)}>
                        {localizeWithFallback('alert.close.button', 'Close')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
