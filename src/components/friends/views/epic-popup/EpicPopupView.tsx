import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';
import { OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useEpicPopup } from '../../../../hooks/friends/useEpicPopup';

/**
 * AIR `HabboEpicPopupView` / `epic_popup_frame_xml` (215x275 frame, centred): the server's image in a 200x200
 * `content_static_bitmap` (centred, never stretched), the `illumina_horizontal_separator` and the
 * `${alert.close.button}` button. A new popup replaces the one on screen.
 */
export const EpicPopupView: FC = () => {
    const { imageUrl, close } = useEpicPopup();

    if (!imageUrl) return null;

    return (
        <NativeTextTree>
            <OctaneCardView key={imageUrl} classNames={['octane-epic-popup']} frameStyle={3} isResizable={false} theme="primary-slim" uniqueKey="epic-popup">
                <OctaneCardHeaderView headerText="" onCloseClick={close} />
                <div className="octane-epic-popup-content" data-testid="epic-popup">
                    <div className="octane-epic-popup-image">
                        <img src={imageUrl} alt="" draggable={false} />
                    </div>
                    <div className="octane-epic-popup-separator" />
                    <BaseButton className="octane-epic-popup-close" onClick={close}>
                        {localizeWithFallback('alert.close.button', 'Close')}
                    </BaseButton>
                </div>
            </OctaneCardView>
        </NativeTextTree>
    );
};
