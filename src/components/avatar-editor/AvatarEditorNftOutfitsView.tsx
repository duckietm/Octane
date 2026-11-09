import { CSSProperties, FC } from 'react';
import { localizeWithFallback } from '../../api';
import { LayoutAvatarImageView } from '../../common';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { ToggleButton } from '../../common/ToggleButton';
import { formatNftOutfitLabel, getNftCollectionStyle, NftOutfit } from '../../hooks';

interface AvatarEditorNftOutfitsViewProps {
    outfits: readonly NftOutfit[];
    selectedOutfit: NftOutfit | null;
    wornOutfit: NftOutfit | null;
    onSelect: (outfit: NftOutfit) => void;
}

/** NftWardrobeParamView.getLocalizedCollectionName: empty for an unknown collection. */
const collectionName = (outfit: NftOutfit): string => {
    const style = getNftCollectionStyle(outfit.contractKey);

    return style ? localizeWithFallback(style.nameKey, style.nameFallback) : '';
};

/** NftOutfit.initNftColors: the outfit's frame in its collection's colours (white for an unknown one). */
const frameStyle = (outfit: NftOutfit): CSSProperties => {
    const colors = getNftCollectionStyle(outfit.contractKey)?.colors ?? ['#ffffff', '#ffffff'];

    return {
        borderColor: colors[1],
        background: `linear-gradient(180deg, ${colors.join(', ')})`
    };
};

/**
 * AIR avatar/nft/NftAvatarsView on the `nfts_content` container of AvatarEditorContent.xml: the
 * "Avatar Collectibles" title, the "click to choose" line and the grid of the user's collectible looks (empty
 * when the user has none, as in AIR).
 * Clicking one previews it (NftAvatarsModel.selectNftAvatar); saving then wears it.
 */
export const AvatarEditorNftOutfitsView: FC<AvatarEditorNftOutfitsViewProps> = (props) => {
    const { outfits = [], selectedOutfit = null, wornOutfit = null, onSelect = null } = props;
    const chooseText = localizeWithFallback('avatareditor.nfts.choose', 'Click to choose');

    return (
        <NativeTextTree>
            <div className="octane-avatar-editor-nfts">
                <span className="octane-avatar-editor-nfts-title">{localizeWithFallback('avatareditor.nfts.title', 'Avatar Collectibles')}</span>
                <span className="octane-avatar-editor-nfts-choose">{chooseText}</span>
                <div className="octane-avatar-editor-nfts-grid">
                    {outfits.map((outfit) => (
                        <ToggleButton
                            key={outfit.id}
                            type="button"
                            className={`octane-avatar-editor-nft-outfit${wornOutfit?.id === outfit.id ? ' is-worn' : ''}`}
                            pressed={selectedOutfit?.id === outfit.id}
                            aria-label={formatNftOutfitLabel(collectionName(outfit), outfit)}
                            style={frameStyle(outfit)}
                            onClick={() => onSelect?.(outfit)}
                        >
                            <LayoutAvatarImageView direction={4} figure={outfit.figure} gender={outfit.gender} fit small />
                        </ToggleButton>
                    ))}
                </div>
            </div>
        </NativeTextTree>
    );
};

/** AIR NftWardrobeParamView (`collectible_avatar_info`): "<collection> #<id>" in the collection's colour. */
export const AvatarEditorNftOutfitInfoView: FC<{ outfit: NftOutfit | null }> = ({ outfit }) => {
    const style = outfit ? getNftCollectionStyle(outfit.contractKey) : null;

    if (!outfit || !style) return null;

    return (
        <NativeTextTree>
            <div className="octane-avatar-editor-nft-info">
                <span style={{ color: style.textColor }}>{formatNftOutfitLabel(collectionName(outfit), outfit)}</span>
            </div>
        </NativeTextTree>
    );
};
