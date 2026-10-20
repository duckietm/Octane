import { GuideSessionReportMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../api';
import { BaseButton, Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';

interface GuideToolReportViewProps {
    onClose: () => void;
}

/**
 * AIR habbo-help report_window (GuideSessionController.openReportWindow / var_393): describe what
 * happened, Send reports the partner of the session (GuideSessionReportMessageComposer), an empty
 * description shows the report_error line, and the cancel link closes the window.
 */
export const GuideToolReportView: FC<GuideToolReportViewProps> = ({ onClose }) => {
    const [message, setMessage] = useState('');
    const [showError, setShowError] = useState(false);

    const submit = () => {
        if (!message.length) {
            setShowError(true);
            return;
        }

        SendMessageComposer(new GuideSessionReportMessageComposer(message));
        onClose();
    };

    return (
        <OctaneCardView
            className="octane-guide-tool octane-guide-report min-w-0 w-[min(282px,calc(100vw-16px))]"
            theme="primary-slim"
            uniqueKey="guide-tool-report"
        >
            <OctaneCardHeaderView headerText={localizeWithFallback('guide.help.request.emergency.title', 'Emergency help request')} onCloseClick={onClose} />
            <OctaneCardContentView className="text-black">
                <div className="flex flex-col gap-1">
                    <Text>
                        {localizeWithFallback(
                            'guide.help.request.emergency.desc',
                            'Tell us what happened. The more details you give, the quicker we can help you.'
                        )}
                    </Text>
                    {showError && (
                        <Text bold small variant="danger" role="alert">
                            {localizeWithFallback('guide.help.request.emergency.desc.error', 'The description cannot be empty.')}
                        </Text>
                    )}
                    <textarea
                        className="request-message"
                        placeholder={localizeWithFallback('guide.help.request.emergency.input.empty', 'Describe what happened')}
                        value={message}
                        onChange={(event) => {
                            setMessage(event.target.value);
                            setShowError(false);
                        }}
                    ></textarea>
                    <Text small>
                        {localizeWithFallback('guide.help.request.emergency.help.title', 'An emergency help request is only meant for urgent problems.')}
                    </Text>
                    <Button fullWidth variant="success" onClick={submit}>
                        {localizeWithFallback('guide.help.request.user.create.input.button', 'Send')}
                    </Button>
                    <BaseButton className="cursor-pointer border-0 bg-transparent p-0 text-center underline" onClick={onClose}>
                        {localizeWithFallback('guide.help.request.user.create.cancel.link', 'Cancel help request')}
                    </BaseButton>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
