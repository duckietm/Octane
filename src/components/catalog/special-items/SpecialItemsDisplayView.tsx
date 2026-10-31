import { FC } from 'react';
import { localizeWithFallback, ProductTypeEnum } from '../../../api';
import { LayoutFurniIconImageView, LayoutFurniImageView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../../common/ToggleButton';
import { carouselElementLayout, claimButtonFor, SpecialItem, spotlightBlendFor } from '../../../hooks/catalog/specialItemsDisplay.helpers';
import { useSpecialItemsDisplay } from '../../../hooks/catalog/useSpecialItemsDisplay';

/** `getLocalization(key, "")`: a missing text is empty, never the raw key. */
const text = (key: string, parameters: string[] = null, replacements: string[] = null): string => localizeWithFallback(key, '', parameters, replacements);

const itemName = (setKey: string, item: SpecialItem): string => text(`special_items.${setKey}.body.${item.itemKey}.title`) || item.furniName;

const itemDescription = (setKey: string, item: SpecialItem): string => text(`special_items.${setKey}.body.${item.itemKey}.desc`);

/**
 * The official special items display (`special_items_display_xml`, 420x495): a
 * showcase title, a rotating platform of furni under a spotlight with
 * previous / next and a page dot per item, the centred item's plaque, and an
 * optional free claim unlocked by viewing every item.
 */
export const SpecialItemsDisplayView: FC = () => {
    const { isVisible = false, setKey = '', items = [], claimState, rotation, close, navigateTo, next, previous, claim } = useSpecialItemsDisplay();

    if (!isVisible || !items.length) return null;

    const count = items.length;
    const shownItem = items[Math.min(Math.max(rotation.shown, 0), count - 1)];
    const plaqueBlend = rotation.blend;
    const spotlightBlend = spotlightBlendFor(plaqueBlend);
    const claimButton = claimButtonFor(claimState);
    const title = localizeWithFallback('special_items.title', '%set_name%', ['set_name'], [text(`special_items.${setKey}.title`)]);

    return (
        <NativeTextTree>
            <OctaneCardView classNames={['octane-special-items']} frameStyle={3} isResizable={false} theme="primary-slim" uniqueKey="special-items-display">
                <OctaneCardHeaderView headerText={title} onCloseClick={close} />
                <div className="octane-special-items-content" data-testid="special-items-display">
                    <div className="octane-special-items-bg" />
                    <div className="octane-special-items-header">
                        <div className="octane-special-items-header-scroll">
                            <div className="octane-special-items-set-title">{text(`special_items.${setKey}.header.title`)}</div>
                            <div className="octane-special-items-set-desc">{text(`special_items.${setKey}.header.desc`)}</div>
                        </div>
                    </div>
                    <div className="octane-special-items-center">
                        <div className="octane-special-items-viewer">
                            <div className="octane-special-items-platform" />
                            <div className="octane-special-items-spotlight-base" style={{ opacity: spotlightBlend }} />
                            <div className="octane-special-items-rotation">
                                {items.map((item) => {
                                    const layout = carouselElementLayout(item.index, rotation.carousel.position, count);

                                    return (
                                        <div
                                            key={item.index}
                                            className="octane-special-items-product"
                                            data-testid="special-items-product"
                                            style={{ left: layout.x, top: layout.y, opacity: layout.blend, zIndex: Math.round(layout.depth * 100) }}
                                        >
                                            <LayoutFurniImageView direction={2} productClassId={item.classId} productType={ProductTypeEnum.FLOOR} />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="octane-special-items-spotlight" style={{ opacity: spotlightBlend }} />
                        </div>
                        <BaseButton
                            aria-label={localizeWithFallback('generic.previous', 'Previous')}
                            className="octane-special-items-nav is-previous"
                            onClick={previous}
                        />
                        <BaseButton aria-label={localizeWithFallback('generic.next', 'Next')} className="octane-special-items-nav is-next" onClick={next} />
                        <div className="octane-special-items-pages">
                            {items.map((item) => (
                                <ToggleButton
                                    key={item.index}
                                    aria-label={itemName(setKey, item)}
                                    pressed={item.index === rotation.carousel.target}
                                    className={`octane-special-items-page${item.index === rotation.carousel.target ? ' is-selected' : ''}`}
                                    onClick={() => navigateTo(item.index)}
                                />
                            ))}
                        </div>
                    </div>
                    {claimButton.visible && (
                        <div className="octane-special-items-claim" data-testid="special-items-claim">
                            <span className="octane-special-items-claim-text">
                                {localizeWithFallback('special_items.claim_info', 'View all items to get a free reward:')}
                            </span>
                            <BaseButton className="octane-special-items-claim-button" disabled={!claimButton.enabled} onClick={claim}>
                                {claimButton.captionKey === 'special_items.claimed'
                                    ? localizeWithFallback('special_items.claimed', 'Claimed')
                                    : localizeWithFallback('special_items.claim', 'Claim')}
                            </BaseButton>
                        </div>
                    )}
                    <div className="octane-special-items-bottom">
                        <div className="octane-special-items-plate is-shadow" />
                        <div className="octane-special-items-plate is-edge" />
                        <div className="octane-special-items-plate is-face">
                            <div className="octane-special-items-item-scroll" style={{ opacity: plaqueBlend }}>
                                <div className="octane-special-items-item-title">{itemName(setKey, shownItem)}</div>
                                <div className="octane-special-items-item-desc">{itemDescription(setKey, shownItem)}</div>
                            </div>
                            <div className="octane-special-items-item-icon" style={{ opacity: plaqueBlend }}>
                                <LayoutFurniIconImageView productClassId={shownItem.classId} productType={ProductTypeEnum.FLOOR} />
                            </div>
                        </div>
                    </div>
                </div>
            </OctaneCardView>
        </NativeTextTree>
    );
};
