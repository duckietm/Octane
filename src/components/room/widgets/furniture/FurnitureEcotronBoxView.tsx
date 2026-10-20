import { FC } from 'react';
import { GetConfigurationValue, LocalizeText, localizeWithFallback } from '../../../../api';
import { DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { ECOTRONBOX_CARD_FURNIMATIC, useFurnitureEcotronBoxWidget } from '../../../../hooks';

/**
 * Official `ecotronbox_card` / `ecotronbox_card_furnimatic` (257 x 114): the gift-card background from
 * the image library (`Giftcards/ecotronbox_card_bg[_furnimatic].png`), the date in the corner, a 39 px
 * preview, the message (the box title, then the prize name) and the Open / Close buttons. The whole card
 * drags, like the official container.
 */
export const FurnitureEcotronBoxView: FC = () => {
    const { objectId = -1, card, date, prizeName, prizeImageUrl, canOpen, open, onClose } = useFurnitureEcotronBoxWidget();

    if (objectId === -1) return null;

    const isFurnimatic = card === ECOTRONBOX_CARD_FURNIMATIC;
    const background = `${GetConfigurationValue<string>('image.library.url', '')}Giftcards/${isFurnimatic ? 'ecotronbox_card_bg_furnimatic' : 'ecotronbox_card_bg'}.png`;
    const title = isFurnimatic
        ? localizeWithFallback('widget.furni.furnimaticbox.title', 'Furnimatic box')
        : localizeWithFallback('widget.furni.ecotronbox.title', 'Surprise box');
    const openText = isFurnimatic
        ? localizeWithFallback('widget.furni.furnimaticbox.open', 'Open the box')
        : localizeWithFallback('widget.furni.ecotronbox.open', 'Open the box');

    return (
        <DraggableWindow handleSelector=".octane-ecotronbox-card" offsetLeft={50} offsetTop={50} windowPosition={DraggableWindowPosition.TOP_LEFT}>
            <div className={`octane-ecotronbox-card${isFurnimatic ? ' is-furnimatic' : ''}`} style={{ backgroundImage: `url(${background})` }}>
                <div className="octane-ecotronbox-date">{date}</div>
                <div className="octane-ecotronbox-preview">{prizeImageUrl && <img alt="" src={prizeImageUrl} />}</div>
                <div className="octane-ecotronbox-msg">{prizeName ?? title}</div>
                {canOpen && (
                    <BaseButton className="octane-ecotronbox-open" onClick={open}>
                        {openText}
                    </BaseButton>
                )}
                <BaseButton className="octane-ecotronbox-close" onClick={onClose}>
                    {LocalizeText('generic.close')}
                </BaseButton>
            </div>
        </DraggableWindow>
    );
};
