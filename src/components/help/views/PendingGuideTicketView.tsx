import { GuideReportingStatusMessageEvent, PendingGuideTicketData } from '@octane/renderer';
import { FC, useState } from 'react';
import { FriendlyTime, LocalizeText, localizeWithFallback, NotificationAlertType } from '../../../api';
import bullyIllustration from '../../../assets/images/help/help_illustrations_bully.png';
import questionIllustration from '../../../assets/images/help/help_illustrations_question.png';
import tourIllustration from '../../../assets/images/help/help_illustrations_tour.png';
import { LayoutAvatarImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useMessageEvent, useNotification } from '../../../hooks';
import {
    GUIDE_REPORTING_STATUS_ABUSIVE,
    GUIDE_REPORTING_STATUS_PENDING_TICKET,
    GUIDE_REPORTING_STATUS_REPORTING_TOO_QUICKLY,
    getPendingGuideTicketIllustration,
    getPendingGuideTicketKeys,
    PendingGuideTicketLayout,
    resolvePendingGuideTicketLayout
} from '../../../hooks/help/pendingGuideTicket';

const ILLUSTRATIONS = { tour: tourIllustration, question: questionIllustration, bully: bullyIllustration } as const;

/**
 * Official HabboHelp.onGuideReportingStatus + HelpController.showPendingTicket:
 * asking for a new help request while a ticket is still open shows the
 * pending tour / instructions / bully / helper-case popup (369px wide, the
 * illustration hanging over the close button) instead of the help window.
 * The abusive / too-quick statuses are told through an alert.
 */
export const PendingGuideTicketView: FC<{}> = () => {
    const [ticket, setTicket] = useState<PendingGuideTicketData>(null);
    const [layout, setLayout] = useState<PendingGuideTicketLayout>(null);
    const { simpleAlert = null } = useNotification();

    useMessageEvent<GuideReportingStatusMessageEvent>(GuideReportingStatusMessageEvent, (event) => {
        const parser = event.getParser();

        switch (parser.statusCode) {
            case GUIDE_REPORTING_STATUS_PENDING_TICKET: {
                const resolved = parser.pendingTicket ? resolvePendingGuideTicketLayout(parser.pendingTicket) : null;

                if (!resolved) return;

                setTicket(parser.pendingTicket);
                setLayout(resolved);
                return;
            }
            case GUIDE_REPORTING_STATUS_ABUSIVE:
                simpleAlert?.(
                    localizeWithFallback(
                        'guide.bully.request.reporter.blocked.body',
                        'Your reports have been deemed as invalid continuously by the guardians, you are unable to send bully reports for a short time.'
                    ),
                    NotificationAlertType.MODERATION,
                    null,
                    null,
                    localizeWithFallback('guide.bully.request.reporter.blocked.caption', 'You are no longer able to send in new reports.')
                );
                return;
            case GUIDE_REPORTING_STATUS_REPORTING_TOO_QUICKLY:
                simpleAlert?.(
                    localizeWithFallback(
                        'help.cfh.error.pending',
                        "We've not gotten round to answering your previous call yet. Please wait a moment before sending a new one."
                    ),
                    NotificationAlertType.MODERATION,
                    null,
                    null,
                    LocalizeText('help.cfh.error.title')
                );
                return;
        }
    });

    if (!ticket || !layout) return null;

    const keys = getPendingGuideTicketKeys(layout);
    const close = () => {
        setTicket(null);
        setLayout(null);
    };

    return (
        <OctaneCardView className="octane-pending-guide-ticket w-[369px]" theme="primary-slim" uniqueKey="pending-guide-ticket" isResizable={false}>
            <OctaneCardHeaderView headerText={LocalizeText(keys.title)} onCloseClick={close} />
            <OctaneCardContentView className="text-black">
                <div className="octane-pending-guide-ticket__body">
                    <Text bold className="octane-pending-guide-ticket__subtitle">
                        {LocalizeText(keys.subtitle)}
                    </Text>
                    <Text small>{LocalizeText(keys.description)}</Text>
                    {keys.report && (
                        <div className="octane-pending-guide-ticket__report">
                            <Text bold small className="text-[#5c5c5c]">
                                {LocalizeText(keys.report)}
                            </Text>
                            {layout === 'instructions' && <Text small>{ticket.description}</Text>}
                            {layout === 'bully' && (
                                <div className="octane-pending-guide-ticket__party">
                                    <div className="octane-pending-guide-ticket__avatar">
                                        <LayoutAvatarImageView figure={ticket.otherPartyFigure} headOnly direction={2} />
                                    </div>
                                    <div className="flex flex-col">
                                        <Text bold small>
                                            {ticket.otherPartyName}
                                        </Text>
                                        <Text small>{LocalizeText('guide.pending.bully.room', ['room'], [ticket.roomName])}</Text>
                                    </div>
                                </div>
                            )}
                            <Text small className="text-[#5c5c5c]">
                                {FriendlyTime.format(ticket.secondsAgo, '.ago', 2)}
                            </Text>
                        </div>
                    )}
                    <div className="octane-pending-guide-ticket__footer">
                        <button type="button" className="habbo-btn-green habbo-btn-green--auto octane-pending-guide-ticket__close" onClick={close}>
                            {LocalizeText('alert.close.button')}
                        </button>
                        <img src={ILLUSTRATIONS[getPendingGuideTicketIllustration(layout)]} alt="" className="octane-pending-guide-ticket__illustration" />
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
