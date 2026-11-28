import { AvatarEditorFigureCategory, AvatarFigurePartType, FigureDataContainer } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { CreateLinkEvent, GetClubMemberLevel, IAvatarEditorCategory, LocalizeText, localizeWithFallback } from '../../api';
import { LayoutCurrencyIcon } from '../../common';
import { useAvatarEditor } from '../../hooks';
import { AvatarEditorIcon } from './AvatarEditorIcon';
import { AvatarEditorFigureSetView } from './figure-set';
import { AvatarEditorAdvancedColorView, AvatarEditorPaletteSetView } from './palette-set';
import { BaseButton } from '../../common/BaseButton';
import { ToggleButton } from '../../common/ToggleButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useIsHandheld } from '../../hooks/handheld/useHandheldLayout';
import { HandheldLooksPartsView } from './HandheldLooksPartsView';

/** What the sub-category pictures stand for (the phone names them for a screen reader); English fallbacks. */
const HANDHELD_PART_NAMES: Record<string, string> = {
    ca: 'Accessories',
    cc: 'Jackets',
    ch: 'Shirts',
    cp: 'Prints',
    ea: 'Eyewear',
    fa: 'Face accessories',
    ha: 'Hats',
    he: 'Hair accessories',
    hr: 'Hair',
    lg: 'Trousers',
    sh: 'Shoes',
    wa: 'Belts'
};

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

    // Phone layout: the same choices as finger-sized chips over the phone's part grid (HandheldLooksPartsView).
    const isHandheld = useIsHandheld();

    if (!activeCategory) return null;

    if (isHandheld) {
        const isGeneric = name === AvatarEditorFigureCategory.GENERIC;
        const genders: [value: string, icon: string, label: string][] = [
            [AvatarFigurePartType.MALE, 'male', LocalizeText('avatareditor.generic.boy')],
            [AvatarFigurePartType.FEMALE, 'female', LocalizeText('avatareditor.generic.girl')]
        ];

        return (
            <HandheldLooksPartsView
                category={activeCategory}
                chips={
                    isGeneric
                        ? genders.map(([value, icon, label]) => (
                              <ToggleButton key={value} className="octane-handheld-looks__chip is-gender" pressed={gender === value} onClick={() => setGender(value)}>
                                  <AvatarEditorIcon icon={icon} selected={gender === value} />
                                  <span>{label}</span>
                              </ToggleButton>
                          ))
                        : categories.length > 1
                          ? categories.map((category) => (
                                <ToggleButton
                                    key={category.setType}
                                    aria-label={localizeWithFallback(`octane.handheld.looks.part.${category.setType}`, HANDHELD_PART_NAMES[category.setType] ?? category.setType)}
                                    className="octane-handheld-looks__chip"
                                    pressed={resolvedSetType === category.setType}
                                    onClick={() => selectSet(category.setType)}
                                >
                                    <AvatarEditorIcon icon={category.setType} selected={resolvedSetType === category.setType} />
                                </ToggleButton>
                            ))
                          : null
                }
                chipsLabel={isGeneric ? localizeWithFallback('octane.handheld.looks.gender', 'Gender') : localizeWithFallback('octane.handheld.looks.parts', 'Clothing types')}
            />
        );
    }

    return (
        <NativeTextTree>
            <div className="octane-avatar-editor-model">
                <div className={`octane-avatar-editor-subcategories${name === AvatarEditorFigureCategory.GENERIC ? ' is-gender' : ''}`}>
                    {name === AvatarEditorFigureCategory.GENERIC && (
                        <>
                            <BaseButton type="button" className="category-item gender-category-item" onClick={() => setGender(AvatarFigurePartType.MALE)}>
                                <AvatarEditorIcon icon="male" selected={gender === FigureDataContainer.MALE} />
                                <span>{LocalizeText('avatareditor.generic.boy')}</span>
                            </BaseButton>
                            <BaseButton type="button" className="category-item gender-category-item" onClick={() => setGender(AvatarFigurePartType.FEMALE)}>
                                <AvatarEditorIcon icon="female" selected={gender === FigureDataContainer.FEMALE} />
                                <span>{LocalizeText('avatareditor.generic.girl')}</span>
                            </BaseButton>
                        </>
                    )}
                    {name !== AvatarEditorFigureCategory.GENERIC &&
                        categories.map((category) => (
                            <ToggleButton
                                type="button"
                                key={category.setType}
                                className="category-item" pressed={resolvedSetType === category.setType}
                                onClick={() => selectSet(category.setType)}
                            >
                                <AvatarEditorIcon icon={category.setType} selected={resolvedSetType === category.setType} />
                            </ToggleButton>
                        ))}
                </div>

                <div className="octane-avatar-editor-parts-grid">
                    <AvatarEditorFigureSetView category={activeCategory} columnCount={6} />
                </div>

                <BaseButton
                    type="button"
                    className={`octane-avatar-editor-advanced-color${advancedColorMode ? ' is-active' : ''}`}
                    onClick={() => (hasHC ? setAdvancedColorMode((prev) => !prev) : CreateLinkEvent('habboUI/open/hccenter'))}
                >
                    {localizeWithFallback('octane.avatar_editor.advanced_color', 'Advanced Color')}
                    <LayoutCurrencyIcon type="hc" />
                </BaseButton>

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
        </NativeTextTree>
    );
};
