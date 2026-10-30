import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { OctaneCardHeaderView, OctaneCardView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { rarityColor, toHexColor } from '../../hooks/collectibles/collectibles.helpers';
import { getCollectibleProductName, useCollectibles } from '../../hooks/collectibles/useCollectibles';
import { CollectibleProductImageView } from './CollectibleProductImageView';

/**
 * `CollectiblesRewardBoxView` (`collectible_reward_xml`, 424x570): what the user's reward box held, on a
 * turning star in the colour of its rarity. Rewards that arrive while one shows wait their turn.
 */
export const CollectiblesRewardBoxView: FC = () => {
    const { rewardQueue = [], dismissReward = null } = useCollectibles();
    const reward = rewardQueue[0] ?? null;

    if (!reward) return null;

    const color = toHexColor(rarityColor(reward.rarity));

    return (
        <NativeTextTree>
            <OctaneCardView classNames={['octane-collectibles-reward-box']} frameStyle={3} isResizable={false} uniqueKey="collectibles-reward-box">
                <OctaneCardHeaderView
                    headerText={localizeWithFallback('collectibles.reward_box.notif.title', 'Reward box opened!')}
                    onCloseClick={() => dismissReward?.()}
                />
                <div className="octane-collectibles-reward-box-content" data-testid="collectibles-reward-box" style={{ backgroundColor: color }}>
                    <div className="octane-collectibles-reward-box-top">
                        <div className="octane-collectibles-reward-box-gradient" />
                        <div className="octane-collectibles-reward-box-title">{localizeWithFallback('collectibles.reward_box.contains', 'Your reward box contains:')}</div>
                        <div className="octane-collectibles-reward-box-name" data-testid="collectibles-reward-box-name">
                            {getCollectibleProductName(reward)}
                        </div>
                        <div className="octane-collectibles-reward-box-product">
                            <div className="octane-collectibles-reward-box-star" />
                            <div className="octane-collectibles-reward-box-image">
                                <CollectibleProductImageView product={reward} />
                            </div>
                        </div>
                    </div>
                    <div className="octane-collectibles-reward-box-rarity">
                        <span className="octane-collectibles-reward-box-rarity-title">{localizeWithFallback('collectibles.item.rarity', 'Rarity')}</span>
                        <span className="octane-collectibles-reward-box-rarity-text">{(reward.rarity ?? '').toUpperCase()}</span>
                    </div>
                    <div className="octane-collectibles-reward-box-bottom">
                        <span>{localizeWithFallback('collectibles.reward_box.info', 'You can find this collectible in your inventory.')}</span>
                        <BaseButton className="octane-collectibles-button is-plain" onClick={() => dismissReward?.()}>
                            {localizeWithFallback('generic.ok', 'OK')}
                        </BaseButton>
                    </div>
                </div>
            </OctaneCardView>
        </NativeTextTree>
    );
};
