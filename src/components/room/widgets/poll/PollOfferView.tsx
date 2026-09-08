import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { PollSessionState } from '../../../../hooks';

interface PollOfferViewProps {
    session: PollSessionState;
    onAccept: (pollId: number) => void;
    onReject: (pollId: number) => void;
    onLater: (pollId: number) => void;
}

/**
 * `poll_offer` (382x250): a dark header strip with Frank and the headline, the summary in a
 * bordered box, then "Cancel..." and "Later..." as links beside the OK button. The header
 * close behaves like "Cancel..." (the server hears the rejection); "Later..." sends nothing.
 * Once a button answered, the others are ignored (`PollOfferDialog.state`).
 */
export const PollOfferView: FC<PollOfferViewProps> = (props) => {
    const { session = null, onAccept = null, onReject = null, onLater = null } = props;

    if (!session) return null;

    const locked = session.offerState !== 'unknown';

    const guard = (action: (pollId: number) => void) => () => {
        if (locked) return;

        action?.(session.id);
    };

    return (
        <OctaneCardView className="octane-poll-offer" theme="primary-slim" uniqueKey={`poll-offer-${session.id}`}>
            <OctaneCardHeaderView headerText={localizeWithFallback('poll_offer_window', 'Poll')} onCloseClick={guard(onReject)} />
            <OctaneCardContentView className="octane-poll-offer-content" gap={0}>
                <div className="octane-poll-offer-header">
                    <div className="octane-poll-offer-portrait" />
                    <div className="octane-poll-offer-headline" data-testid="poll-offer-headline">
                        {session.headline || localizeWithFallback('poll_offer_title', 'Poll')}
                    </div>
                </div>
                <div className="octane-poll-offer-body">
                    <div className="octane-poll-offer-summary" data-testid="poll-offer-summary">
                        {session.summary || localizeWithFallback('poll.default.summary', "We'd like to ask something...")}
                    </div>
                    <div className="octane-poll-offer-options">
                        <button className="octane-poll-link" disabled={locked} type="button" onClick={guard(onReject)}>
                            {localizeWithFallback('cancel', 'Cancel')}...
                        </button>
                        <button className="octane-poll-link" disabled={locked} type="button" onClick={guard(onLater)}>
                            {localizeWithFallback('poll_offer_later', 'Later...')}
                        </button>
                        <Button className="octane-poll-ok" disabled={locked} variant="primary" onClick={guard(onAccept)}>
                            {localizeWithFallback('ok', 'OK')}
                        </Button>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
