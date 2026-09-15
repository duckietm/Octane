import { FC } from 'react';
import { usePollSessions } from '../../../../hooks';
import { PollOfferView } from './PollOfferView';
import { PollQuestionView } from './PollQuestionView';

/** `PollWidget`: one offer or question window per poll session the server started. */
export const PollWidgetView: FC<{}> = (props) => {
    const {
        sessions = [],
        acceptOffer = null,
        rejectOffer = null,
        postponeOffer = null,
        answerQuestion = null,
        cancelPoll = null,
        finishPoll = null
    } = usePollSessions();

    if (!sessions.length) return null;

    return (
        <>
            {sessions.map((session) =>
                session.stage === 'offer' ? (
                    <PollOfferView key={session.id} session={session} onAccept={acceptOffer} onLater={postponeOffer} onReject={rejectOffer} />
                ) : (
                    <PollQuestionView key={session.id} session={session} onAnswer={answerQuestion} onCancel={cancelPoll} onFinished={finishPoll} />
                )
            )}
        </>
    );
};
