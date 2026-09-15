import { CreateLinkEvent, GuildEditFailedMessageEvent, HabboGroupJoinFailedMessageEvent } from '@octane/renderer';
import { FC, useState } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback, NotificationAlertType } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { useMessageEvent, useNotification } from '../../../hooks';
import { GroupFailureOutcome, GroupHcRequiredMode, getGroupHcRequiredInfoKey, resolveGroupEditFailure, resolveGroupJoinFailure } from './groupHcRequired';

/**
 * Official HcRequiredWindowCtrl (club_required layout, 428x215): shown when a
 * group join fails with reason 4 or a group edit fails with reason 2. Every
 * other reason becomes the plain `group.joinfail.N` / `group.edit.fail.N`
 * alert of HabboGroupsManager.
 */
export const GroupHcRequiredView: FC<{}> = () => {
    const [mode, setMode] = useState<GroupHcRequiredMode>(null);
    const { simpleAlert = null } = useNotification();

    const applyOutcome = (outcome: GroupFailureOutcome) => {
        if (outcome.hcRequired) {
            setMode(outcome.hcRequired);

            return;
        }

        simpleAlert?.(localizeWithFallback(outcome.messageKey, outcome.messageKey), NotificationAlertType.DEFAULT, null, null, LocalizeText(outcome.titleKey));
    };

    useMessageEvent<HabboGroupJoinFailedMessageEvent>(HabboGroupJoinFailedMessageEvent, (event) =>
        applyOutcome(resolveGroupJoinFailure(event.getParser().reason))
    );

    useMessageEvent<GuildEditFailedMessageEvent>(GuildEditFailedMessageEvent, (event) => applyOutcome(resolveGroupEditFailure(event.getParser().reason)));

    if (!mode) return null;

    const close = () => setMode(null);

    /** HabboGroupsManager.openVipPurchase -> catalog club center. */
    const openClubCenter = () => {
        const links = GetConfigurationValue<Record<string, string>>('catalog.links', {});

        CreateLinkEvent(`catalog/open/${links?.['hc.buy_hc'] ?? 'habbo_club'}`);
        close();
    };

    return (
        <OctaneCardView className="octane-group-hc-required w-[428px]" theme="primary" uniqueKey="group-hc-required" isResizable={false}>
            <OctaneCardHeaderView headerText={LocalizeText('group.hcrequired.title')} onCloseClick={close} />
            <OctaneCardContentView className="p-0 text-black" overflow="hidden">
                <div className="octane-group-hc-required__hero">
                    <i className="octane-icon icon-hc-banner octane-group-hc-required__icon" />
                    <div className="octane-group-hc-required__copy">
                        <p className="octane-group-hc-required__info">{LocalizeText(getGroupHcRequiredInfoKey(mode))}</p>
                        <button type="button" className="octane-group-hc-required__more" onClick={openClubCenter}>
                            {LocalizeText('group.hcrequired.moreinfo')}
                        </button>
                    </div>
                </div>
                <div className="octane-group-hc-required__footer">
                    <button type="button" className="octane-group-hc-required__cancel" onClick={close}>
                        {LocalizeText('generic.cancel')}
                    </button>
                    <button type="button" className="habbo-btn-green habbo-btn-green--auto octane-group-hc-required__join" onClick={openClubCenter}>
                        {LocalizeText('group.hcrequired.join')}
                    </button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
