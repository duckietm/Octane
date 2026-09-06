import { OctaneEventType } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { AvatarEditorThumbnailsHelper, GetClubMemberLevel, GetConfigurationValue, IAvatarEditorCategoryPartItem } from '../../../api';
import hcSmallSrc from '../../../assets/images/avatareditor/air/hc-small.png';
import { LayoutCurrencyIcon, LayoutGridItemProps } from '../../../common';
import { useAvatarEditor } from '../../../hooks';
import { useOctaneEvent } from '../../../hooks/events';
import { InfiniteGrid } from '../../../layout';
import { AvatarEditorIcon } from '../AvatarEditorIcon';

export const AvatarEditorFigureSetItemView: FC<
    {
        setType: string;
        partItem: IAvatarEditorCategoryPartItem;
        isSelected: boolean;
    } & LayoutGridItemProps
> = (props) => {
    const { setType = null, partItem = null, isSelected = false, ...rest } = props;
    const partKey = `${setType}:${partItem?.id ?? -1}`;
    const [thumbnail, setThumbnail] = useState<{ partKey: string; url: string }>(null);
    const [loadingState, setLoadingState] = useState<{ partKey: string; isLoading: boolean }>(null);
    const { selectedColorParts = null, getFigureStringWithFace = null } = useAvatarEditor();
    const selectedColors = selectedColorParts?.[setType] ?? null;

    const clubLevel = partItem.partSet?.clubLevel ?? 0;
    const isHC = !GetConfigurationValue<boolean>('hc.disabled', false) && clubLevel > 0;
    const isSellableNotOwned = partItem.isSellableNotOwned ?? false;
    const isHead = setType === 'hd';
    const isPartLocked = (isHC && GetClubMemberLevel() < clubLevel) || isSellableNotOwned;
    const faceFigureString = isHead && partItem ? getFigureStringWithFace?.(partItem.id) : null;
    const [retryId, setRetryId] = useState(0);
    const requestIdRef = useRef(0);
    const assetUrl = thumbnail?.partKey === partKey ? thumbnail.url : '';
    const isLoading = loadingState?.partKey === partKey ? loadingState.isLoading : true;
    const assetUrlRef = useRef(assetUrl);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    assetUrlRef.current = assetUrl;

    useOctaneEvent(OctaneEventType.AVATAR_ASSET_LOADED, () => {
        if (!isHead || assetUrlRef.current || retryTimeoutRef.current) return;

        // Avatar libraries notify after their download callbacks. Give the
        // renderer a tick to publish the aliases before making a fresh face.
        retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;

            if (!assetUrlRef.current) setRetryId((previous) => previous + 1);
        }, 250);
    });

    useEffect(
        () => () => {
            if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        },
        []
    );

    useEffect(() => {
        const requestId = ++requestIdRef.current;

        if (!setType || !setType.length || !partItem || partItem.isClear) {
            setLoadingState({ partKey, isLoading: false });

            return;
        }

        setLoadingState({ partKey, isLoading: true });
        let disposed = false;
        const loadingTimeout = setTimeout(() => {
            if (!disposed && requestIdRef.current === requestId) setLoadingState({ partKey, isLoading: false });
        }, 6000);

        const loadImage = async () => {
            const partClubLevel = partItem.partSet?.clubLevel ?? 0;
            const partIsHC = !GetConfigurationValue<boolean>('hc.disabled', false) && partClubLevel > 0;
            const partIsLocked = partIsHC && GetClubMemberLevel() < partClubLevel;

            let url: string = null;

            if (isHead) {
                url = await AvatarEditorThumbnailsHelper.buildForFace(faceFigureString, partIsLocked || isSellableNotOwned);
            } else {
                url = await AvatarEditorThumbnailsHelper.build(setType, partItem, partItem.usesColor, selectedColors, partIsLocked || isSellableNotOwned);
            }

            if (disposed || requestIdRef.current !== requestId) return;

            if (url && url.length) {
                setThumbnail({ partKey, url });
            }

            setLoadingState({ partKey, isLoading: false });
        };

        loadImage();

        return () => {
            disposed = true;
            clearTimeout(loadingTimeout);
        };
    }, [setType, partItem, partKey, selectedColors, faceFigureString, isHead, isSellableNotOwned, retryId]);

    if (!partItem) return null;

    const showLoading = !partItem.isClear && isLoading && (!assetUrl || !assetUrl.length);

    return (
        <InfiniteGrid.Item
            itemActive={isSelected}
            className={`avatar-parts mx-auto${isHead ? ' is-head' : ''}${showLoading ? ' is-loading' : ''}${isSelected ? ' part-selected' : ''}${!partItem.isClear && isSellableNotOwned ? ' pet-sellable-locked' : ''}`}
            {...rest}
        >
            {!partItem.isClear && assetUrl && (
                <img
                    src={assetUrl}
                    alt=""
                    className={`max-w-full max-h-full pointer-events-none image-rendering-pixelated${isHead ? ' avatar-editor-face-thumbnail' : ''}${
                        isHead && isPartLocked ? ' is-disabled' : ''
                    }`}
                    draggable={false}
                />
            )}
            {!partItem.isClear && isHC && <img className="avatar-editor-part-hc" src={hcSmallSrc} alt="" draggable={false} />}
            {partItem.isClear && <AvatarEditorIcon icon="clear" />}
            {!partItem.isClear && partItem.partSet.isSellable && !isSellableNotOwned && (
                <AvatarEditorIcon className="avatar-editor-sellable-icon absolute" icon="sellable" />
            )}
            {!partItem.isClear && isSellableNotOwned && (
                <div className="pet-sellable-badge">
                    <LayoutCurrencyIcon type={-1} />
                </div>
            )}
        </InfiniteGrid.Item>
    );
};
