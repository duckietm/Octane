import { AvatarFigurePartType } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AvatarEditorThumbnailsHelper, CreateLinkEvent, GetClubMemberLevel, IAvatarEditorCategory, IAvatarEditorCategoryPartItem } from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorIcon } from './AvatarEditorIcon';
import { AvatarEditorFigureSetView } from './figure-set';
import { AvatarEditorAdvancedColorView, AvatarEditorPaletteSetView } from './palette-set';

export const AvatarEditorPetView: FC<{
    categories: IAvatarEditorCategory[];
}> = (props) => {
    const { categories = [] } = props;
    const [slotThumbnail, setSlotThumbnail] = useState<{ partId: number; url: string }>(null);
    const [advancedColorMode, setAdvancedColorMode] = useState<boolean>(false);
    const thumbnailRequestRef = useRef<number>(0);
    const {
        selectedParts = null,
        selectEditorPart = null,
        selectedColorParts = null,
        maxPaletteCount = 1,
        getFirstSelectableColor = null,
        selectEditorColor = null
    } = useAvatarEditor();
    const hasHC = GetClubMemberLevel() > 0;

    const petCategory = categories.length ? categories[0] : null;
    const selectedPetSetId = selectedParts?.['pt'] ?? null;
    const selectedPetColors = selectedColorParts?.['pt'] ?? null;
    const hasColors = !!petCategory?.colorItems?.[0]?.length;

    const selectedPartItem = useMemo(() => {
        if (selectedPetSetId === null || selectedPetSetId === undefined || !petCategory?.partItems) return null;

        return petCategory.partItems.find((item) => item.partSet?.id === selectedPetSetId) ?? null;
    }, [selectedPetSetId, petCategory]);
    const slotThumbUrl = slotThumbnail && selectedPartItem && slotThumbnail.partId === selectedPartItem.id ? slotThumbnail.url : null;

    // Ensure color is initialized when pet tab loads
    useEffect(() => {
        if (!petCategory) return;

        const selectedPalettes = selectedColorParts?.['pt'];

        if (!selectedPalettes || !selectedPalettes.length) selectEditorColor?.('pt', 0, getFirstSelectableColor?.('pt'));
    }, [petCategory, selectedColorParts, selectEditorColor, getFirstSelectableColor]);

    useEffect(() => {
        const requestId = ++thumbnailRequestRef.current;

        if (!selectedPartItem || !selectedPartItem.partSet) {
            setSlotThumbnail(null);

            return;
        }

        let disposed = false;

        const loadThumb = async () => {
            const url = await AvatarEditorThumbnailsHelper.build(AvatarFigurePartType.PET, selectedPartItem, selectedPartItem.usesColor, selectedPetColors);

            if (!disposed && thumbnailRequestRef.current === requestId && url) setSlotThumbnail({ partId: selectedPartItem.id, url });
        };

        void loadThumb();

        return () => {
            disposed = true;
        };
    }, [selectedPartItem, selectedPetColors]);

    const removePet = useCallback(() => {
        selectEditorPart?.('pt', -1);
        setSlotThumbnail(null);
    }, [selectEditorPart]);

    if (!petCategory || !petCategory.partItems || !petCategory.partItems.length) {
        return <div className="octane-avatar-editor-empty-state">No companion pets available.</div>;
    }

    return (
        <div className="octane-avatar-editor-model octane-avatar-editor-pet-model">
            <div className="octane-avatar-editor-subcategories octane-avatar-editor-pet-subcategories">
                <button type="button" className="category-item" aria-pressed="true">
                    <AvatarEditorIcon icon="pt" selected />
                </button>
                <div className="octane-avatar-editor-pet-equipped">
                    {selectedPartItem && slotThumbUrl ? <img src={slotThumbUrl} alt="" draggable={false} /> : <AvatarEditorIcon icon="pt" />}
                    <span>{selectedPartItem ? 'Companion equipped' : 'No companion selected'}</span>
                    {selectedPartItem && (
                        <button type="button" className="octane-avatar-editor-pet-remove" aria-label="Remove companion" onClick={removePet}>
                            <AvatarEditorIcon icon="clear" />
                        </button>
                    )}
                </div>
            </div>

            <div className="octane-avatar-editor-parts-grid">
                <AvatarEditorFigureSetView category={petCategory} columnCount={6} />
            </div>

            {hasColors && (
                <>
                    <button
                        type="button"
                        className={`octane-avatar-editor-advanced-color${advancedColorMode ? ' is-active' : ''}`}
                        onClick={() => (hasHC ? setAdvancedColorMode((prev) => !prev) : CreateLinkEvent('habboUI/open/hccenter'))}
                    >
                        Advanced Color
                        <LayoutCurrencyIcon type="hc" />
                    </button>
                    <div className={`octane-avatar-editor-palettes${maxPaletteCount === 2 ? ' dual-palette' : ''}`}>
                        {maxPaletteCount >= 1 && (
                            <div className="avatar-editor-palette-set-view">
                                {advancedColorMode ? (
                                    <AvatarEditorAdvancedColorView category={petCategory} paletteIndex={0} />
                                ) : (
                                    <AvatarEditorPaletteSetView category={petCategory} columnCount={maxPaletteCount === 2 ? 9 : 20} paletteIndex={0} />
                                )}
                            </div>
                        )}
                        {maxPaletteCount === 2 && (
                            <div className="avatar-editor-palette-set-view">
                                {advancedColorMode ? (
                                    <AvatarEditorAdvancedColorView category={petCategory} paletteIndex={1} />
                                ) : (
                                    <AvatarEditorPaletteSetView category={petCategory} columnCount={9} paletteIndex={1} />
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
