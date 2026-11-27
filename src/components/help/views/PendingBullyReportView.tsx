import { FC } from 'react';
import { FriendlyTime, guardianText, pendingTicketWindow } from '../../../api';
import bullyIllustration from '../../../assets/images/guide-tool/chat-review/illustrations-bully.png';
import { Button, LayoutAvatarImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useHelp } from '../../../hooks';

/**
 * AIR pending_bully_request (HelpController.showPendingTicket): the reporter already has a report
 * open, so instead of a new one they see who they reported, where and how long ago. A pending tour,
 * question or help case of a guide gets its own title and text, as in AIR.
 */
export const PendingBullyReportView: FC<{}> = () => {
    const { pendingBullyTicket = null, setPendingBullyTicket = null } = useHelp();

    if (!pendingBullyTicket) return null;

    const kind = pendingTicketWindow(pendingBullyTicket.type, pendingBullyTicket.isGuide);

    if (!kind) return null;

    const close = () => setPendingBullyTicket(null);
    const showsTicket = kind === 'bully' || kind === 'instructions';

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-guardian-pending" theme="primary-slim" uniqueKey="pending-bully-request">
                <OctaneCardHeaderView headerText={guardianText(`guide.pending.${kind}.title`)} onCloseClick={close} />
                <OctaneCardContentView className="text-black">
                    <div className="octane-guardian-feedback__content">
                        <div className="octane-guardian-feedback__text">
                            <div className="octane-guardian-feedback__caption">{guardianText(`guide.pending.${kind}.subtitle`)}</div>
                            <div className="octane-guardian-feedback__body">{guardianText(`guide.pending.${kind}.description`)}</div>
                        </div>
                        <img alt="" className="octane-guardian-feedback__illustration" draggable={false} src={bullyIllustration} />
                    </div>
                    {showsTicket && (
                        <div className="octane-guardian-pending__ticket">
                            <div className="octane-guardian-pending__heading">{guardianText(`guide.pending.${kind}.report`)}</div>
                            <div className="octane-guardian-pending__user">
                                <span className="octane-guardian-pending__avatar">
                                    <LayoutAvatarImageView
                                        headOnly
                                        compactHead
                                        compactHeadPadding={0}
                                        compactHeadSize={24}
                                        direction={2}
                                        figure={pendingBullyTicket.otherPartyFigure ?? ''}
                                    />
                                </span>
                                <div className="flex flex-col">
                                    <b>{pendingBullyTicket.otherPartyName}</b>
                                    {kind === 'bully' && !!pendingBullyTicket.roomName && (
                                        <span>{guardianText('guide.pending.bully.room', ['room'], [pendingBullyTicket.roomName])}</span>
                                    )}
                                    {kind === 'instructions' && !!pendingBullyTicket.description && <span>{pendingBullyTicket.description}</span>}
                                    <span className="octane-guardian-pending__time">{FriendlyTime.format(pendingBullyTicket.secondsAgo, '.ago')}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <Button className="self-center" variant="secondary" onClick={close}>
                        {guardianText('alert.close.button')}
                    </Button>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
