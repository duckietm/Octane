import { CollectibleProductData } from '@octane/renderer';
import { CSSProperties, FC } from 'react';
import { LocalizeText, localizeWithFallback } from '../../api';
import { BaseButton } from '../../common/BaseButton';
import { DraggableWindow } from '../../common/draggable-window';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { getCollectibleProductName } from '../../hooks/collectibles/useCollectibles';
import { CollectibleProductImageView } from './CollectibleProductImageView';

export interface HandheldCollectiblesRewardBoxViewProps {
    reward: CollectibleProductData;
    /** The rarity's colour (the band behind the picture). */
    color: string;
    /** Rewards still waiting behind this one. */
    waiting: number;
    onDismiss: () => void;
}

/**
 * An opened reward box on a phone: a card in the middle of the screen (HandheldCollectibles.css) with the prize on the
 * turning star in its rarity's colour, its name and rarity, where to find it, and OK. On its side the picture stands
 * left of the texts so the card stays low. The next waiting reward follows on OK, as on the desktop.
 */
export const HandheldCollectiblesRewardBoxView: FC<HandheldCollectiblesRewardBoxViewProps> = ({ reward, color, waiting, onDismiss }) => (
    <NativeTextTree>
        <DraggableWindow uniqueKey="collectibles-reward-box">
            <div
                aria-label={localizeWithFallback('collectibles.reward_box.notif.title', 'Reward box opened!')}
                className="octane-handheld-collectibles-box"
                data-testid="collectibles-reward-box"
                role="dialog"
                style={{ '--collectibles-rarity': color } as CSSProperties}
            >
                <div className="octane-handheld-collectibles-box__head">
                    <span className="octane-handheld-collectibles-box__title">
                        {localizeWithFallback('collectibles.reward_box.notif.title', 'Reward box opened!')}
                    </span>
                    <BaseButton aria-label={LocalizeText('generic.close')} className="octane-handheld-collectibles-box__close" onClick={onDismiss}>
                        <svg aria-hidden="true" viewBox="0 0 16 16">
                            <path d="M4 4 L12 12 M12 4 L4 12" />
                        </svg>
                    </BaseButton>
                </div>
                <div className="octane-handheld-collectibles-box__prize">
                    <div aria-hidden="true" className="octane-handheld-collectibles__star" />
                    <div className="octane-handheld-collectibles-box__image">
                        <CollectibleProductImageView product={reward} />
                    </div>
                </div>
                <div className="octane-handheld-collectibles-box__body">
                    <span className="octane-handheld-collectibles-box__contains">
                        {localizeWithFallback('collectibles.reward_box.contains', 'Your reward box contains:')}
                    </span>
                    <strong className="octane-handheld-collectibles-box__name" data-testid="collectibles-reward-box-name">
                        {getCollectibleProductName(reward)}
                    </strong>
                    <span className="octane-handheld-collectibles-box__rarity">
                        <span>{localizeWithFallback('collectibles.item.rarity', 'Rarity')}</span>
                        <strong>{(reward.rarity ?? '').toUpperCase()}</strong>
                    </span>
                    <span className="octane-handheld-collectibles-box__info">
                        {localizeWithFallback('collectibles.reward_box.info', 'You can find this collectible in your inventory.')}
                    </span>
                    <BaseButton className="octane-handheld-collectibles__button is-primary" data-testid="collectibles-reward-box-ok" onClick={onDismiss}>
                        {waiting > 0
                            ? localizeWithFallback('octane.handheld.collectibles.next_reward', 'Next (%count% more)', ['count'], [String(waiting)])
                            : localizeWithFallback('generic.ok', 'OK')}
                    </BaseButton>
                </div>
            </div>
        </DraggableWindow>
    </NativeTextTree>
);
