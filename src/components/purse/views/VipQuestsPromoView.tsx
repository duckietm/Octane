import { CitizenshipVipOfferPromoEnabledEvent, StartCampaignMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { GetConfigurationValue, GetOptionalConfigurationValue, localizeWithFallback, SendMessageComposer } from '../../../api';
import { TALENT_LIBRARY_IMAGES } from '../../../assets/images/talent/library';
import { BaseButton } from '../../../common/BaseButton';
import { useMessageEvent } from '../../../hooks/events';
import { TalentImageView } from '../../talent/TalentImageView';

/** AIR HabboToolbar.initCitizenshipVipQuestsExtension: the box exists only with this switch on. */
export const isVipQuestsPromoEnabled = (): boolean => GetOptionalConfigurationValue<boolean>('citizenship.vip.quest.promotion.enabled', false) === true;

/** Whether the server announced the free club days in this session, and the box was not used up yet. */
export const useVipQuestsPromo = () => {
    const [visible, setVisible] = useState(false);

    useMessageEvent<CitizenshipVipOfferPromoEnabledEvent>(CitizenshipVipOfferPromoEnabledEvent, () => {
        if (isVipQuestsPromoEnabled()) setVisible(true);
    });

    return { visible, close: () => setVisible(false) };
};

/**
 * AIR CitizenshipVipQuestsPromoExtension (vip_quests_promo_xml, 193 x 216): shown under the purse once the
 * citizenship track gave free club days, in place of the club renewal bar. The button starts the club quest
 * campaign (`citizenship.vip.tutorial.quest.campaign.name`) and the box goes; the corner button folds it to its
 * title bar.
 */
export const VipQuestsPromoView: FC<{ onClose: () => void }> = ({ onClose }) => {
    const [expanded, setExpanded] = useState(true);
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    const start = () => {
        const campaign = GetOptionalConfigurationValue<string>('citizenship.vip.tutorial.quest.campaign.name', '');

        if (campaign) SendMessageComposer(new StartCampaignMessageComposer(campaign));

        onClose();
    };

    const foldLabel = expanded ? localizeWithFallback('generic.minimize', 'Minimize') : localizeWithFallback('generic.maximize', 'Maximize');

    return (
        <div className={`octane-purse-vip-quests${expanded ? '' : ' is-folded'}`}>
            <div className="octane-purse-vip-quests__title">{localizeWithFallback('citizenship.vip.quests.title', 'Welcome!')}</div>
            <BaseButton
                type="button"
                aria-label={foldLabel}
                aria-expanded={expanded}
                className="octane-purse-vip-quests__fold"
                onClick={() => setExpanded((value) => !value)}
            >
                {expanded ? '–' : '+'}
            </BaseButton>
            {expanded && (
                <>
                    <div className="octane-purse-vip-quests__caption">{localizeWithFallback('citizenship.vip.quests.caption', 'Welcome to Habbo Club!')}</div>
                    <div className="octane-purse-vip-quests__info">
                        {localizeWithFallback(
                            'citizenship.vip.quests.info',
                            'You just received free Habbo Club days! Do the club quests to discover what it brings you.'
                        )}
                    </div>
                    <BaseButton type="button" className="octane-purse-vip-quests__button" onClick={start}>
                        {localizeWithFallback('citizenship.vip.quests.button', 'Start!')}
                    </BaseButton>
                    {/* Habbo no longer hosts this picture: the hotel's own copy wins, else the club tower of the
                        sibling "extend" promo stands in. */}
                    <TalentImageView
                        className="octane-purse-vip-quests__image"
                        fallback={TALENT_LIBRARY_IMAGES.citizenship_vip_extend_promo}
                        src={`${imageLibraryUrl}talent/citizenship_vip_quest_promo.png`}
                    />
                </>
            )}
        </div>
    );
};
