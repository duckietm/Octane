import { AvatarFigurePartType, FigureDataContainer } from '@octane/renderer';
import { FC, Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CreateLinkEvent, GetClubMemberLevel, IAvatarEditorCategory } from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorIcon } from './AvatarEditorIcon';
import { AvatarEditorFigureSetView } from './figure-set';
import { AvatarEditorAdvancedColorView, AvatarEditorPaletteSetView } from './palette-set';

export const AvatarEditorNftView: FC<{
    categories: IAvatarEditorCategory[];
}> = (props) => {
    const { categories = [] } = props;
    const [activeSetType, setActiveSetType] = useState(() => categories[0]?.setType ?? '');
    const [advancedColorMode, setAdvancedColorMode] = useState(false);
    const subcategoryRef = useRef<HTMLDivElement>(null);
    const hasHC = GetClubMemberLevel() > 0;
    const {
        maxPaletteCount = 1,
        selectedColorParts = null,
        getFirstSelectableColor = null,
        selectEditorColor = null,
        gender = null,
        setGender = null
    } = useAvatarEditor();

    const resolvedSetType = useMemo(() => {
        if (categories.some((category) => category.setType === activeSetType)) return activeSetType;

        return categories[0]?.setType ?? '';
    }, [categories, activeSetType]);

    const activeCategory = useMemo(() => {
        return categories.find((category) => category.setType === resolvedSetType) ?? null;
    }, [categories, resolvedSetType]);

    const selectSet = useCallback(
        (setType: string) => {
            const selectedPalettes = selectedColorParts?.[setType];

            if (!selectedPalettes || !selectedPalettes.length) selectEditorColor?.(setType, 0, getFirstSelectableColor?.(setType));

            setActiveSetType(setType);

            if (setType === AvatarFigurePartType.HEAD) subcategoryRef.current?.scrollTo({ left: 0, behavior: 'auto' });
        },
        [getFirstSelectableColor, selectEditorColor, selectedColorParts]
    );

    useEffect(() => {
        if (!resolvedSetType) return;

        const selectedPalettes = selectedColorParts?.[resolvedSetType];

        if (resolvedSetType === activeSetType && selectedPalettes?.length) return;

        selectSet(resolvedSetType);
    }, [activeSetType, resolvedSetType, selectSet, selectedColorParts]);

    if (!categories.length || !activeCategory) {
        return <div className="octane-avatar-editor-empty-state">No NFT items available.</div>;
    }

    const hasPagedSubcategories = categories.length + (resolvedSetType === AvatarFigurePartType.HEAD ? 2 : 0) > 5;

    const scrollSubcategories = (direction: number) => {
        subcategoryRef.current?.scrollBy({ left: direction * 260, behavior: 'auto' });
    };

    return (
        <div className="octane-avatar-editor-model octane-avatar-editor-nft-model">
            <div ref={subcategoryRef} className={`octane-avatar-editor-subcategories${hasPagedSubcategories ? ' is-paged' : ''}`}>
                {categories.map((category) => (
                    <Fragment key={category.setType}>
                        <button
                            type="button"
                            className="category-item"
                            aria-pressed={resolvedSetType === category.setType}
                            onClick={() => selectSet(category.setType)}
                        >
                            <AvatarEditorIcon icon={category.setType} selected={resolvedSetType === category.setType} />
                        </button>
                        {category.setType === AvatarFigurePartType.HEAD && resolvedSetType === AvatarFigurePartType.HEAD && (
                            <>
                                <button type="button" className="category-item" onClick={() => setGender?.(AvatarFigurePartType.MALE)}>
                                    <AvatarEditorIcon icon="male" selected={gender === FigureDataContainer.MALE} />
                                </button>
                                <button type="button" className="category-item" onClick={() => setGender?.(AvatarFigurePartType.FEMALE)}>
                                    <AvatarEditorIcon icon="female" selected={gender === FigureDataContainer.FEMALE} />
                                </button>
                            </>
                        )}
                    </Fragment>
                ))}
            </div>
            {hasPagedSubcategories && (
                <>
                    <button
                        type="button"
                        className="octane-avatar-editor-nft-category-scroll is-left"
                        aria-label="Previous NFT categories"
                        onClick={() => scrollSubcategories(-1)}
                    />
                    <button
                        type="button"
                        className="octane-avatar-editor-nft-category-scroll is-right"
                        aria-label="Next NFT categories"
                        onClick={() => scrollSubcategories(1)}
                    />
                </>
            )}

            <div className="octane-avatar-editor-parts-grid">
                <AvatarEditorFigureSetView category={activeCategory} columnCount={6} />
            </div>

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
                            <AvatarEditorAdvancedColorView category={activeCategory} paletteIndex={0} />
                        ) : (
                            <AvatarEditorPaletteSetView category={activeCategory} columnCount={maxPaletteCount === 2 ? 9 : 20} paletteIndex={0} />
                        )}
                    </div>
                )}
                {maxPaletteCount === 2 && (
                    <div className="avatar-editor-palette-set-view">
                        {advancedColorMode ? (
                            <AvatarEditorAdvancedColorView category={activeCategory} paletteIndex={1} />
                        ) : (
                            <AvatarEditorPaletteSetView category={activeCategory} columnCount={9} paletteIndex={1} />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
