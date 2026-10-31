import { FC, Fragment } from 'react';
import { GetConfigurationValue, getTalentLevelUpImageUrl, getTalentProductImageUrl, localizeWithFallback } from '../../api';
import vipReward from '../../assets/images/talent/talent_vip_reward.png';
import { LayoutBadgeImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ITalentLevelUp } from '../../hooks';
import { LibraryImageView } from '../help/habbo-way/HabboWayPagerView';

interface TalentLevelUpViewProps {
    levelUp: ITalentLevelUp;
    onClose: () => void;
    onOpenTrack: (name: string) => void;
}

/**
 * Official TalentLevelUpController (`level_up` layout, 430x362): the new level, its rewards joined
 * by "+", the button that opens the track and the level decoration beside the frame.
 */
export const TalentLevelUpView: FC<TalentLevelUpViewProps> = ({ levelUp, onClose, onOpenTrack }) => {
    const library = GetConfigurationValue<string>('image.library.url', '');
    const { track, level, perks, products } = levelUp;
    const rewards = [
        ...perks.map((perk) => (
            <div key={`perk-${perk}`} className="octane-talent-levelup__reward">
                <LayoutBadgeImageView badgeCode={perk} />
                <span>{localizeWithFallback(`perk.${perk}.name`, perk)}</span>
            </div>
        )),
        ...products.map((product, index) =>
            product.vipDays > 0 ? (
                <div key={`vip-${index}`} className="octane-talent-levelup__reward">
                    <img alt="" src={vipReward} />
                    <span>{localizeWithFallback('catalog.vip.item.header.days', `${product.vipDays} days`, ['num_days'], [product.vipDays.toString()])}</span>
                </div>
            ) : (
                <div key={`product-${index}`} className="octane-talent-levelup__reward">
                    <LibraryImageView src={getTalentProductImageUrl(library, product.productCode)} />
                </div>
            )
        )
    ];

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-talent-levelup" theme="primary-slim" uniqueKey="talent-level-up">
                <OctaneCardHeaderView headerText={localizeWithFallback('talent.track.common.levelup.caption', 'A level up on the talent track!')} onCloseClick={onClose} />
                <OctaneCardContentView className="text-black" gap={1}>
                    <div className="octane-talent-levelup__title">{localizeWithFallback('talent.track.common.levelup.title', 'Full of talent!')}</div>
                    <div className="octane-talent-levelup__message">{localizeWithFallback(`talent.track.${track}.levelup.message`, '')}</div>
                    <div className="octane-talent-levelup__box">
                        <div className="octane-talent-levelup__level">{localizeWithFallback(`talent.track.${track}.level.${level}.title`, '')}</div>
                        <div>{localizeWithFallback(`talent.track.${track}.level.${level}.description`, '')}</div>
                        {rewards.length > 0 && (
                            <div className="octane-talent-levelup__rewards">
                                <div className="octane-talent-levelup__rewards-title">{localizeWithFallback('talent.track.common.levelup.rewards', 'THIS IS WHAT YOU GET:')}</div>
                                <div className="octane-talent-levelup__reward-list">
                                    {rewards.map((reward, index) => (
                                        <Fragment key={index}>
                                            {index > 0 && <span className="octane-talent-levelup__plus">+</span>}
                                            {reward}
                                        </Fragment>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <BaseButton
                        className="octane-habboway__action octane-talent-levelup__button"
                        type="button"
                        onClick={() => {
                            onClose();
                            onOpenTrack(track);
                        }}
                    >
                        {localizeWithFallback('talent.track.common.levelup.check', 'Check your talent track')}
                    </BaseButton>
                    <BaseButton className="octane-talent-dialog__decline" type="button" onClick={onClose}>
                        {localizeWithFallback('alert.close.button', 'Close')}
                    </BaseButton>
                    <LibraryImageView className="octane-talent-levelup__decoration" src={getTalentLevelUpImageUrl(library, track, level)} />
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
