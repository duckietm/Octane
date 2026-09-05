import { AvatarEditorFigureCategory, AvatarFigurePartType, FigureDataContainer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { CreateLinkEvent, GetClubMemberLevel, IAvatarEditorCategory, LocalizeText } from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorIcon } from './AvatarEditorIcon';
import { AvatarEditorFigureSetView } from './figure-set';
import { AvatarEditorAdvancedColorView, AvatarEditorPaletteSetView } from './palette-set';

export const AvatarEditorModelView: FC<{
    name: string;
    categories: IAvatarEditorCategory[];
}> = (props) => {
    const { name = '', categories = [] } = props;
    const [activeSetType, setActiveSetType] = useState<string>(() => categories[0]?.setType ?? '');
    const [advancedColorMode, setAdvancedColorMode] = useState<boolean>(false);
    const hasHC = GetClubMemberLevel() > 0;
    const {
        maxPaletteCount = 1,
        gender = null,
        setGender = null,
        selectedColorParts = null,
        getFirstSelectableColor = null,
        selectEditorColor = null
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
        },
        [getFirstSelectableColor, selectEditorColor, selectedColorParts]
    );

    useEffect(() => {
        if (!resolvedSetType) return;

        const selectedPalettes = selectedColorParts?.[resolvedSetType];

        if (resolvedSetType === activeSetType && selectedPalettes?.length) return;

        selectSet(resolvedSetType);
    }, [activeSetType, resolvedSetType, selectSet, selectedColorParts]);

    if (!activeCategory) return null;

    return (
        <div className="octane-avatar-editor-model">
            <div className={`octane-avatar-editor-subcategories${name === AvatarEditorFigureCategory.GENERIC ? ' is-gender' : ''}`}>
                {name === AvatarEditorFigureCategory.GENERIC && (
                    <>
                        <button type="button" className="category-item gender-category-item" onClick={() => setGender(AvatarFigurePartType.MALE)}>
                            <AvatarEditorIcon icon="male" selected={gender === FigureDataContainer.MALE} />
                            <span>{LocalizeText('avatareditor.generic.boy')}</span>
                        </button>
                        <button type="button" className="category-item gender-category-item" onClick={() => setGender(AvatarFigurePartType.FEMALE)}>
                            <AvatarEditorIcon icon="female" selected={gender === FigureDataContainer.FEMALE} />
                            <span>{LocalizeText('avatareditor.generic.girl')}</span>
                        </button>
                    </>
                )}
                {name !== AvatarEditorFigureCategory.GENERIC &&
                    categories.map((category) => (
                        <button
                            type="button"
                            key={category.setType}
                            className="category-item"
                            aria-pressed={resolvedSetType === category.setType}
                            onClick={() => selectSet(category.setType)}
                        >
                            <AvatarEditorIcon icon={category.setType} selected={resolvedSetType === category.setType} />
                        </button>
                    ))}
            </div>

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
