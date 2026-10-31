import { FC } from 'react';
import { localizeWithFallback } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { HotLook } from '../../hooks';

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
