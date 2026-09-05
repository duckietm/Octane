import { AvatarDirectionAngle, GetAvatarRenderManager, IPartColor } from '@octane/renderer';
import { FC, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { AvatarEditorThumbnailsHelper } from '../../../api';
import faceTabIcon from '../../../assets/images/wardrobe/hd.png';
import headTabIcon from '../../../assets/images/wardrobe/head.png';
import legsTabIcon from '../../../assets/images/wardrobe/legs.png';
import torsoTabIcon from '../../../assets/images/wardrobe/torso.png';
import { LayoutAvatarImageView } from '../../../common';
import { InfiniteGrid } from '../../../layout';
import { AvatarEditorIcon } from '../../avatar-editor/AvatarEditorIcon';
import { t } from '../utils/i18n';

type GenderKey = 'M' | 'F';
type FigureSelection = Record<string, { partId: number; colors: number[] }>;
type PartOptions = Record<string, Record<GenderKey, number[]>>;
type PaletteOptions = Record<string, { id: number; hex: string }[]>;

interface WardrobeGroup {
    key: string;
    icon: string;
    labelKey: string;
    fallback: string;
    setTypes: string[];
}

const WARDROBE_GROUPS: WardrobeGroup[] = [
    { key: 'face', icon: faceTabIcon, labelKey: 'nitro.login.register.wardrobe.face', fallback: 'Face', setTypes: ['hd'] },
    { key: 'head', icon: headTabIcon, labelKey: 'nitro.login.register.wardrobe.head', fallback: 'Head', setTypes: ['hr', 'ha', 'he', 'ea', 'fa'] },
    { key: 'torso', icon: torsoTabIcon, labelKey: 'nitro.login.register.wardrobe.torso', fallback: 'Torso', setTypes: ['ch', 'cp', 'cc', 'ca'] },
    { key: 'legs', icon: legsTabIcon, labelKey: 'nitro.login.register.wardrobe.legs', fallback: 'Legs', setTypes: ['lg', 'sh', 'wa'] }
];

const REQUIRED_SET_TYPES = new Set(['hd', 'hr', 'ch', 'lg', 'sh']);

const SET_TYPE_LABELS: Record<string, { key: string; fallback: string }> = {
    hd: { key: 'nitro.login.register.avatar.face', fallback: 'Face' },
    hr: { key: 'nitro.login.register.avatar.hair', fallback: 'Hair' },
    ha: { key: 'nitro.login.register.avatar.hat', fallback: 'Hats' },
    he: { key: 'nitro.login.register.avatar.head_accessory', fallback: 'Head accessories' },
    ea: { key: 'nitro.login.register.avatar.eyewear', fallback: 'Eyewear' },
    fa: { key: 'nitro.login.register.avatar.face_accessory', fallback: 'Face accessories' },
    ch: { key: 'nitro.login.register.avatar.top', fallback: 'Tops' },
    cp: { key: 'nitro.login.register.avatar.print', fallback: 'Prints' },
    cc: { key: 'nitro.login.register.avatar.jacket', fallback: 'Jackets' },
    ca: { key: 'nitro.login.register.avatar.chest_accessory', fallback: 'Chest accessories' },
    lg: { key: 'nitro.login.register.avatar.bottom', fallback: 'Bottoms' },
    sh: { key: 'nitro.login.register.avatar.shoes', fallback: 'Shoes' },
    wa: { key: 'nitro.login.register.avatar.waist_accessory', fallback: 'Waist accessories' }
};

interface WardrobePartItemProps {
    setType: string;
    partId: number;
    colorIds: number[];
    selected: boolean;
    label: string;
    onSelect: () => void;
}

const WardrobePartItem: FC<WardrobePartItemProps> = ({ setType, partId, colorIds, selected, label, onSelect }) => {
    const [assetUrl, setAssetUrl] = useState('');
    const colorKey = colorIds.join('-');

    useEffect(() => {
        if (partId < 0) {
            setAssetUrl('');
            return;
        }

        setAssetUrl('');
        let cancelled = false;

        const loadThumbnail = async () => {
            try {
                if (setType === 'hd') {
                    const colorSuffix = colorIds.length ? `-${colorIds.join('-')}` : '';
                    const url = await AvatarEditorThumbnailsHelper.buildForFace(`hd-${partId}${colorSuffix}`);
                    if (!cancelled && url) setAssetUrl(url);
                    return;
                }

                const setData = GetAvatarRenderManager().structureData.getSetType(setType);
                const partSet = setData?.partSets?.getValues().find((candidate) => candidate.id === partId);
                if (!setData || !partSet) return;

                const palette = GetAvatarRenderManager().structureData.getPalette(setData.paletteID);
                const partColors = colorIds
                    .map((colorId) => palette?.colors?.getValues().find((color) => color.id === colorId))
                    .filter((color): color is IPartColor => Boolean(color));
                let maxPaletteCount = 0;
                for (const part of partSet.parts) maxPaletteCount = Math.max(maxPaletteCount, part.colorLayerIndex);

                const url = await AvatarEditorThumbnailsHelper.build(
                    setType,
                    { id: partId, partSet, usesColor: partSet.isColorable, maxPaletteCount },
                    partSet.isColorable,
                    partColors
                );
                if (!cancelled && url) setAssetUrl(url);
            } catch {}
        };

        void loadThumbnail();
        return () => {
            cancelled = true;
        };
    }, [setType, partId, colorKey]);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onSelect();
    };

    return (
        <InfiniteGrid.Item
            itemActive={selected}
            itemImage={partId >= 0 ? assetUrl || undefined : undefined}
            className={`registration-wardrobe-part wardrobe-part-${setType} avatar-parts${selected ? ' part-selected' : ''}${partId >= 0 && !assetUrl ? ' wardrobe-part-loading' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={partId < 0 ? t('nitro.login.register.wardrobe.none', 'None') : `${label} ${partId}`}
            aria-pressed={selected}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
        >
            {partId < 0 && <AvatarEditorIcon icon="clear" />}
        </InfiniteGrid.Item>
    );
};

interface RegistrationAvatarWardrobeProps {
    gender: GenderKey;
    figure: string;
    selection: FigureSelection;
    partOptions: PartOptions;
    paletteOptions: PaletteOptions;
    onSelectPart: (setType: string, partId: number) => void;
    onSelectColor: (setType: string, colorId: number) => void;
}

export const RegistrationAvatarWardrobe: FC<RegistrationAvatarWardrobeProps> = ({
    gender,
    figure,
    selection,
    partOptions,
    paletteOptions,
    onSelectPart,
    onSelectColor
}) => {
    const [direction, setDirection] = useState(4);
    const [activeGroupKey, setActiveGroupKey] = useState(WARDROBE_GROUPS[0].key);
    const [activeSetType, setActiveSetType] = useState(WARDROBE_GROUPS[0].setTypes[0]);
    const activeGroup = WARDROBE_GROUPS.find((group) => group.key === activeGroupKey) ?? WARDROBE_GROUPS[0];
    const setTypeLabel = SET_TYPE_LABELS[activeSetType] ?? { key: activeSetType, fallback: activeSetType.toUpperCase() };
    const translatedSetTypeLabel = t(setTypeLabel.key, setTypeLabel.fallback);
    const selectedPart = selection[activeSetType]?.partId ?? -1;
    const selectedColor = selection[activeSetType]?.colors?.[0] ?? -1;
    const availableParts = partOptions[activeSetType]?.[gender] ?? [];
    const displayedParts = useMemo(() => (REQUIRED_SET_TYPES.has(activeSetType) ? availableParts : [-1, ...availableParts]), [activeSetType, availableParts]);
    const availableColors = paletteOptions[activeSetType] ?? [];

    const selectGroup = (group: WardrobeGroup) => {
        setActiveGroupKey(group.key);
        setActiveSetType(group.setTypes[0]);
    };

    const rotateAvatar = (delta: number) => {
        setDirection((currentDirection) => {
            const minimum = AvatarDirectionAngle.MIN_DIRECTION;
            const maximum = AvatarDirectionAngle.MAX_DIRECTION;
            const directionCount = maximum - minimum + 1;

            return ((((currentDirection - minimum + delta) % directionCount) + directionCount) % directionCount) + minimum;
        });
    };

    return (
        <div className="registration-avatar-wardrobe">
            <div className="registration-wardrobe-tabs" role="tablist" aria-label={t('nitro.login.register.wardrobe.categories', 'Clothing categories')}>
                {WARDROBE_GROUPS.map((group) => {
                    const active = group.key === activeGroup.key;
                    const label = t(group.labelKey, group.fallback);
                    return (
                        <button
                            key={group.key}
                            type="button"
                            className={active ? 'active' : ''}
                            role="tab"
                            aria-selected={active}
                            aria-label={label}
                            title={label}
                            onClick={() => selectGroup(group)}
                        >
                            <img src={group.icon} alt="" draggable={false} />
                        </button>
                    );
                })}
            </div>

            <div className="registration-wardrobe-main">
                <div className="avatar-preview-panel registration-wardrobe-preview">
                    <div className="avatar-preview" aria-label={t('nitro.login.register.avatar.preview', 'Your Habbo preview')}>
                        <LayoutAvatarImageView direction={direction} figure={figure} gender={gender} scale={1.7} />
                        <div className="registration-avatar-shadow" />
                    </div>
                    <div className="registration-wardrobe-rotation">
                        <button
                            type="button"
                            aria-label={t('nitro.login.register.wardrobe.rotate_left', 'Rotate left')}
                            title={t('nitro.login.register.wardrobe.rotate_left', 'Rotate left')}
                            onClick={() => rotateAvatar(1)}
                        >
                            <AvatarEditorIcon icon="arrow-left" />
                        </button>
                        <button
                            type="button"
                            aria-label={t('nitro.login.register.wardrobe.rotate_right', 'Rotate right')}
                            title={t('nitro.login.register.wardrobe.rotate_right', 'Rotate right')}
                            onClick={() => rotateAvatar(-1)}
                        >
                            <AvatarEditorIcon icon="arrow-right" />
                        </button>
                    </div>
                </div>

                <div className="registration-wardrobe-editor">
                    <div className="registration-wardrobe-set-tabs" role="tablist" aria-label={t(activeGroup.labelKey, activeGroup.fallback)}>
                        {activeGroup.setTypes.length > 1 &&
                            activeGroup.setTypes.map((setType) => {
                                const labelInfo = SET_TYPE_LABELS[setType];
                                const label = t(labelInfo.key, labelInfo.fallback);
                                const active = activeSetType === setType;
                                return (
                                    <button
                                        key={setType}
                                        type="button"
                                        className={active ? 'active' : ''}
                                        role="tab"
                                        aria-selected={active}
                                        aria-label={label}
                                        title={label}
                                        onClick={() => setActiveSetType(setType)}
                                    >
                                        <AvatarEditorIcon icon={setType} selected={active} />
                                    </button>
                                );
                            })}
                    </div>

                    <div className="registration-wardrobe-section-title">{translatedSetTypeLabel}</div>
                    <div className="registration-wardrobe-parts">
                        {displayedParts.length ? (
                            <InfiniteGrid<number>
                                items={displayedParts}
                                columnCount={7}
                                itemMinWidth={48}
                                estimateSize={52}
                                rowGap={5}
                                overscan={2}
                                itemRender={(partId) => (
                                    <WardrobePartItem
                                        setType={activeSetType}
                                        partId={partId}
                                        colorIds={selection[activeSetType]?.colors ?? []}
                                        selected={partId === selectedPart}
                                        label={translatedSetTypeLabel}
                                        onSelect={() => onSelectPart(activeSetType, partId)}
                                    />
                                )}
                            />
                        ) : (
                            <div className="registration-wardrobe-loading">{t('nitro.login.register.wardrobe.loading', 'Loading wardrobe…')}</div>
                        )}
                    </div>

                    <div className="registration-wardrobe-section-title">{t('nitro.login.register.wardrobe.colors', 'Colors')}</div>
                    <div className="registration-wardrobe-palette">
                        {availableColors.map((color) => (
                            <button
                                key={color.id}
                                type="button"
                                className={color.id === selectedColor ? 'active' : ''}
                                style={{ backgroundColor: color.hex }}
                                aria-label={`${t('nitro.login.register.wardrobe.color', 'Color')} ${color.id}`}
                                aria-pressed={color.id === selectedColor}
                                disabled={selectedPart < 0}
                                onClick={() => onSelectColor(activeSetType, color.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
