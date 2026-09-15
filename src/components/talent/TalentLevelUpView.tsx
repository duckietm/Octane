import { FC, ReactNode } from 'react';
import {
    getTalentLevelTextKey,
    getTalentLevelUpDecorationUrl,
    getTalentRewardProductUrl,
    getTalentTrackTextKey,
    LocalizeText,
    localizeWithFallback
} from '../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useTalentTrack } from '../../hooks';

/**
 * level_up (430x362, TalentLevelUpController.showWindow): the new level, its rewards
 * (perks, products, VIP days joined by "+") and the button to the talent track.
 */
export const TalentLevelUpView: FC<{}> = () => {
    const { levelUp = null, closeLevelUp = null, requestTalentTrack = null } = useTalentTrack();

    if (!levelUp) return null;

    const rewards: Array<{ key: string; node: ReactNode }> = [];

    levelUp.perks.forEach((perkId) =>
        rewards.push({
            key: `perk-${perkId}`,
            node: (
                <div className="octane-talent-levelup-reward octane-talent-levelup-reward-perk">
                    <div className="octane-talent-perk-image" title={perkId} />
                    <Text bold>{localizeWithFallback(`perk.${perkId}.name`, perkId)}</Text>
                </div>
            )
        })
    );

    levelUp.products.forEach((product, index) =>
        rewards.push({
            key: `product-${index}`,
            node:
                product.vipDays > 0 ? (
                    <div className="octane-talent-levelup-reward octane-talent-levelup-reward-vip">
                        <div className="octane-talent-vip-icon" />
                        <Text bold>{LocalizeText('catalog.vip.item.header.days', ['num_days'], [product.vipDays.toString()])}</Text>
                    </div>
                ) : (
                    <img
                        alt={product.productCode}
                        className="octane-talent-levelup-reward octane-talent-levelup-reward-product"
                        src={getTalentRewardProductUrl(product.productCode)}
                    />
                )
        })
    );

    const openTrack = () => {
        const name = levelUp.name;

        closeLevelUp && closeLevelUp();
        requestTalentTrack && requestTalentTrack(name);
    };

    return (
        <OctaneCardView className="octane-talent-levelup" theme="primary-slim" uniqueKey="talent-level-up">
            <OctaneCardHeaderView
                headerText={localizeWithFallback('talent.track.common.levelup.caption', 'Talent Track level up!')}
                onCloseClick={() => closeLevelUp && closeLevelUp()}
            />
            <OctaneCardContentView className="text-black">
                <div className="octane-talent-levelup-body">
                    <div className="octane-talent-levelup-text">
                        <Text bold className="octane-talent-levelup-title">
                            {localizeWithFallback('talent.track.common.levelup.title', 'Mad Skills!')}
                        </Text>
                        <Text bold className="octane-talent-levelup-message" wrap>
                            {localizeWithFallback(
                                getTalentTrackTextKey(levelUp.name, 'levelup.message'),
                                'Your hard work has just unlocked a new level on the talent track!'
                            )}
                        </Text>
                        <div className="octane-talent-levelup-panel octane-card-panel">
                            <Text bold>{localizeWithFallback(getTalentLevelTextKey(levelUp.name, levelUp.level, 'title'), `Level ${levelUp.level}`)}</Text>
                            <Text wrap>{localizeWithFallback(getTalentLevelTextKey(levelUp.name, levelUp.level, 'description'), '')}</Text>
                            {rewards.length > 0 && (
                                <div className="octane-talent-levelup-rewards">
                                    <hr className="octane-card-divider m-0" />
                                    <Text bold className="octane-talent-levelup-rewards-title">
                                        {localizeWithFallback('talent.track.common.levelup.rewards', "HERE'S WHAT YOU GOT:")}
                                    </Text>
                                    <div className="octane-talent-levelup-reward-list">
                                        {rewards.map((reward, index) => (
                                            <div key={reward.key} className="octane-talent-levelup-reward-slot">
                                                {index > 0 && <span className="octane-talent-levelup-plus">+</span>}
                                                {reward.node}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="octane-talent-levelup-actions">
                            <Button variant="primary" onClick={openTrack}>
                                {localizeWithFallback('talent.track.common.levelup.check', 'Go check your talent track')}
                            </Button>
                            <Text center className="octane-talent-link" underline onClick={() => closeLevelUp && closeLevelUp()}>
                                {localizeWithFallback('alert.close.button', 'Close')}
                            </Text>
                        </div>
                    </div>
                    <img
                        alt=""
                        className="octane-talent-levelup-decoration"
                        src={getTalentLevelUpDecorationUrl(levelUp.name, levelUp.level)}
                        onError={(event) => (event.currentTarget.style.display = 'none')}
                    />
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
