import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { HotLook } from '../../hooks';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';

interface AvatarEditorHotLooksViewProps {
    hotLooks: readonly HotLook[];
    onSelect: (look: HotLook) => void;
}

/**
 * AIR avatar/hotlooks/HotLooksView on the `hotlooks_content` container of
 * AvatarEditorContent.xml: a title, a "click to choose" line and a grid of Outfit
 * thumbnails (direction 4). Clicking one loads it into the editor (HotLooksModel.selectHotLook).
 */
export const AvatarEditorHotLooksView: FC<AvatarEditorHotLooksViewProps> = (props) => {
    const { hotLooks = [], onSelect = null } = props;
    const chooseText = localizeWithFallback('avatareditor.hotlooks.choose', 'Click to choose');
    // Phone layout: the same looks as finger-sized cards (HandheldLooks.css).
    const isHandheld = useIsHandheld();

    if (isHandheld) {
        return (
            <NativeTextTree>
                <div className="octane-handheld-looks__gallery">
                    <div className="octane-handheld-looks__gallery-head">
                        <b>{localizeWithFallback('avatareditor.hotlooks.title', 'Popular looks in the hotel.')}</b>
                        <span>{chooseText}</span>
                    </div>
                    <div className="octane-handheld-looks__outfits">
                        {hotLooks.map((look, index) => (
                            <BaseButton key={`${look.gender}-${index}-${look.figure}`} aria-label={chooseText} className="octane-handheld-looks__outfit" onClick={() => onSelect?.(look)}>
                                <LayoutAvatarImageView direction={4} figure={look.figure} gender={look.gender} fit small />
                            </BaseButton>
                        ))}
                    </div>
                </div>
            </NativeTextTree>
        );
    }

    return (
        <NativeTextTree>
            <div className="octane-avatar-editor-hotlooks">
                <span className="octane-avatar-editor-hotlooks-title">
                    {localizeWithFallback('avatareditor.hotlooks.title', 'Popular looks in the hotel.')}
                </span>
                <span className="octane-avatar-editor-hotlooks-choose">{chooseText}</span>
                <div className="octane-avatar-editor-hotlooks-grid">
                    {hotLooks.map((look, index) => (
                        <BaseButton
                            key={`${look.gender}-${index}-${look.figure}`}
                            type="button"
                            className="octane-avatar-editor-hotlook"
                            aria-label={chooseText}
                            onClick={() => onSelect?.(look)}
                        >
                            <LayoutAvatarImageView direction={4} figure={look.figure} gender={look.gender} fit small />
                        </BaseButton>
                    ))}
                </div>
            </div>
        </NativeTextTree>
    );
};
