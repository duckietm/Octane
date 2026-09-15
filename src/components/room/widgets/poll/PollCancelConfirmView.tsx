import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';

interface PollCancelConfirmViewProps {
    pollId: number;
    onConfirm: () => void;
    onDismiss: () => void;
}

/** `poll_cancel_confim` (221x153): "Stop answering?", the warning that the poll cannot be resumed, Cancel / OK. */
export const PollCancelConfirmView: FC<PollCancelConfirmViewProps> = (props) => {
    const { pollId = -1, onConfirm = null, onDismiss = null } = props;

    return (
        <OctaneCardView className="octane-poll-cancel-confirm" theme="primary-slim" uniqueKey={`poll-cancel-${pollId}`}>
            <OctaneCardHeaderView headerText={localizeWithFallback('poll_cancel_confirm_title', 'Cancel poll')} onCloseClick={onDismiss} />
            <OctaneCardContentView gap={1}>
                <div className="font-bold">{localizeWithFallback('poll_cancel_confirm_short', 'Stop answering?')}</div>
                <div className="octane-poll-cancel-confirm-long">
                    {localizeWithFallback('poll_cancel_confirm_long', "Are you sure you want to stop answering the poll? You can't continue later.")}
                </div>
                <div className="flex justify-end gap-2 mt-2">
                    <Button variant="secondary" onClick={onDismiss}>
                        {localizeWithFallback('cancel', 'Cancel')}
                    </Button>
                    <Button variant="primary" onClick={onConfirm}>
                        {localizeWithFallback('ok', 'OK')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
