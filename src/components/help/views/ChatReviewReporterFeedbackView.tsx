import { FC } from 'react';
import { guardianText, reporterFeedbackText, SanitizeHtml } from '../../../api';
import bullyIllustration from '../../../assets/images/guide-tool/chat-review/illustrations-bully.png';
import notificationIcon from '../../../assets/images/guide-tool/chat-review/notification.png';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useHelp } from '../../../hooks';

/**
 * AIR chat_review_reporter_feedback (ChatReviewReporterFeedbackCtrl): what became of a bully
 * report, for the creation result (sent, blocked, no chat, already reported), the reporting
 * status (blocked, too quick) and the verdict of the guardians (valid, invalid).
 */
export const ChatReviewReporterFeedbackView: FC<{}> = () => {
    const { bullyReportFeedback = null, setBullyReportFeedback = null } = useHelp();

    if (!bullyReportFeedback) return null;

    const close = () => setBullyReportFeedback(null);

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-guardian-feedback" theme="primary-slim" uniqueKey="chat-review-reporter-feedback">
                <OctaneCardHeaderView headerText={guardianText('guide.bully.request.reporter.title')} onCloseClick={close} />
                <OctaneCardContentView className="text-black">
                    <div className="octane-guardian-feedback__content">
                        <div className="octane-guardian-feedback__text">
                            <div className="octane-guardian-feedback__caption">{reporterFeedbackText(bullyReportFeedback, 'caption')}</div>
                            <div
                                className="octane-guardian-feedback__body"
                                dangerouslySetInnerHTML={{ __html: SanitizeHtml(reporterFeedbackText(bullyReportFeedback, 'body')) }}
                            />
                        </div>
                        <img alt="" className="octane-guardian-feedback__illustration" draggable={false} src={bullyIllustration} />
                    </div>
                    <div className="octane-guardian-feedback__note">
                        <img alt="" draggable={false} src={notificationIcon} />
                        <span>{reporterFeedbackText(bullyReportFeedback, 'note')}</span>
                    </div>
                    <Button className="self-center" variant="secondary" onClick={close}>
                        {guardianText('alert.close.button')}
                    </Button>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
