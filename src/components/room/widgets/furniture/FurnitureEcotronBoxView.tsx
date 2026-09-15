import { FC } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../../api';
import { Button, DraggableWindow, DraggableWindowPosition } from '../../../../common';
import { ECOTRON_BOX_VARIANT_FURNIMATIC, useFurnitureEcotronBoxWidget } from '../../../../hooks';

/**
 * `ecotronbox_card` / `ecotronbox_card_furnimatic` (257x114): the card background from the
 * image library, the date line top-left, the message in the middle, Open (controllers only)
 * and Close along the bottom.
 */
export const FurnitureEcotronBoxView: FC<{}> = (props) => {
    const { objectId = -1, text = '', variant = '', isController = false, isOpening = false, openBox = null, onClose = null } = useFurnitureEcotronBoxWidget();

    if (objectId === -1) return null;

    const furnimatic = variant === ECOTRON_BOX_VARIANT_FURNIMATIC;
    const backgroundImage = `${GetConfigurationValue<string>('image.library.url', '')}Giftcards/ecotronbox_card_bg${furnimatic ? '_furnimatic' : ''}.png`;

    return (
        <DraggableWindow handleSelector=".drag-handler" uniqueKey="ecotron-box" windowPosition={DraggableWindowPosition.CENTER}>
            <div className={`octane-ecotron-box drag-handler ${furnimatic ? 'furnimatic' : ''}`} style={{ backgroundImage: `url(${backgroundImage})` }}>
                <div className="octane-ecotron-box-date" data-testid="ecotron-box-date">
                    {text}
                </div>
                <div className="octane-ecotron-box-msg" data-testid="ecotron-box-msg">
                    {furnimatic
                        ? localizeWithFallback('widget.furni.furnimaticbox.title', 'Furni-Matic box')
                        : localizeWithFallback('widget.furni.ecotronbox.title', 'Ecotron box')}
                </div>
                <div className="octane-ecotron-box-buttons">
                    {isController && !isOpening && (
                        <Button variant="success" onClick={openBox}>
                            {furnimatic
                                ? localizeWithFallback('widget.furni.furnimaticbox.open', 'Open the box')
                                : localizeWithFallback('widget.furni.ecotronbox.open', 'Open')}
                        </Button>
                    )}
                    <Button variant="secondary" onClick={onClose}>
                        {localizeWithFallback('generic.close', 'Close')}
                    </Button>
                </div>
            </div>
        </DraggableWindow>
    );
};
