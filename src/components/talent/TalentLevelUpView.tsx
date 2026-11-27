import { FC, Fragment } from 'react';
import { GetConfigurationValue, getTalentLevelUpImageUrl, getTalentProductImageUrl, localizeWithFallback } from '../../api';
import vipReward from '../../assets/images/talent/talent_vip_reward.png';
import { LayoutBadgeImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ITalentLevelUp } from '../../hooks';
import { TalentImageView } from './TalentImageView';
import { HANDHELD_TOUCH_FRAME_SCALE } from '../../api/handheld/handheldWindowFit';

interface TalentLevelUpViewProps {
    levelUp: ITalentLevelUp;
    onClose: () => void;
    onOpenTrack: (name: string) => void;
}

/**
 * Official TalentLevelUpController (`level_up` layout, 430x362): the new level, its rewards joined
 * by "+", the button that opens the track and the level decoration beside the frame. Drawn in the reward
 * track's AIR frame, the level in a grey panel and the rewards on plates under a "Levels"-style heading.
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
                    <TalentImageView productCode={product.productCode} src={getTalentProductImageUrl(library, product.productCode)} />
                </div>
            )
        )
    ];

    return (
        <NativeTextTree>
            <OctaneCardView handheldScale={HANDHELD_TOUCH_FRAME_SCALE} className="octane-talent-levelup" frameStyle={3} isResizable={false} theme="primary-slim" uniqueKey="talent-level-up">
                <OctaneCardHeaderView headerText={localizeWithFallback('talent.track.common.levelup.caption', 'A level up on the talent track!')} onCloseClick={onClose} />
                <OctaneCardContentView className="octane-talent-levelup__content text-black" gap={1} overflow="visible">
                    <div className="octane-talent-levelup__title">{localizeWithFallback('talent.track.common.levelup.title', 'Full of talent!')}</div>
                    <div className="octane-talent-levelup__message">{localizeWithFallback(`talent.track.${track}.levelup.message`, '')}</div>
                    <div className="octane-talent-levelup__box">
                        <div className="octane-talent-levelup__level">{localizeWithFallback(`talent.track.${track}.level.${level}.title`, '')}</div>
                        <div className="octane-talent-levelup__description">{localizeWithFallback(`talent.track.${track}.level.${level}.description`, '')}</div>
                        {rewards.length > 0 && (
                            <div className="octane-talent-levelup__rewards">
                                <span className="octane-talent-levelup__rule" />
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
                        className="octane-talent-button octane-talent-levelup__button"
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
                    <TalentImageView className="octane-talent-levelup__decoration" src={getTalentLevelUpImageUrl(library, track, level)} />
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
