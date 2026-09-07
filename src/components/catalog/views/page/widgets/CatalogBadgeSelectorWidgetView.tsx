import { StringDataType } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { GetConfigurationValue, LocalizeBadgeDescription, LocalizeBadgeName, LocalizeText } from '../../../../../api';
import { AutoGrid, AutoGridProps, ClassicScrollAreaView, LayoutBadgeImageView, LayoutGridItem } from '../../../../../common';
import { useCatalogData, useCatalogUiState, useInventoryBadges } from '../../../../../hooks';

interface CatalogBadgeSelectorWidgetViewProps extends AutoGridProps {}

const MAX_SEARCH_LENGTH = 40;

export const CatalogBadgeSelectorWidgetView: FC<CatalogBadgeSelectorWidgetViewProps> = (props) => {
    const { columnCount = 0, className = '', ...rest } = props;
    const [currentBadgeCode, setCurrentBadgeCode] = useState<string>(null);
    const [searchText, setSearchText] = useState('');
    const { currentOffer = null } = useCatalogData();
    const { setPurchaseOptions = null } = useCatalogUiState();
    const { badgeCodes = [], activate = null, deactivate = null } = useInventoryBadges();

    const excludedBadgeCodes = useMemo(
        () =>
            new Set(
                GetConfigurationValue<string>('badge.display.excluded.badgeCodes', '')
                    .split(',')
                    .map((badgeCode) => badgeCode.trim())
                    .filter(Boolean)
            ),
        []
    );

    const availableBadgeCodes = useMemo(() => badgeCodes.filter((badgeCode) => !excludedBadgeCodes.has(badgeCode)), [badgeCodes, excludedBadgeCodes]);
    const filteredBadgeCodes = useMemo(() => {
        const normalizedSearch = searchText.trim().toLocaleLowerCase();

        if (!normalizedSearch) return availableBadgeCodes;

        return availableBadgeCodes.filter((badgeCode) =>
            `${badgeCode} ${LocalizeBadgeName(badgeCode)} ${LocalizeBadgeDescription(badgeCode)}`.toLocaleLowerCase().includes(normalizedSearch)
        );
    }, [availableBadgeCodes, searchText]);

    const previewStuffData = useMemo(() => {
        if (!currentBadgeCode) return null;

        const stuffData = new StringDataType();

        stuffData.setValue(['0', currentBadgeCode, '', '']);

        return stuffData;
    }, [currentBadgeCode]);

    useEffect(() => {
        if (!currentOffer) return;

        setPurchaseOptions((prevValue) => {
            const newValue = { ...prevValue };

            newValue.extraParamRequired = true;
            newValue.extraData = (previewStuffData && previewStuffData.getValue(1)) || null;
            newValue.previewStuffData = previewStuffData;

            return newValue;
        });
    }, [currentOffer, previewStuffData, setPurchaseOptions]);

    useEffect(() => {
        if (!activate) return;

        const id = activate();

        return () => deactivate?.(id);
    }, [activate, deactivate]);

    useEffect(() => {
        if (!currentBadgeCode || availableBadgeCodes.includes(currentBadgeCode)) return;

        setCurrentBadgeCode(null);
    }, [availableBadgeCodes, currentBadgeCode]);

    useEffect(() => {
        if (!currentBadgeCode || filteredBadgeCodes.includes(currentBadgeCode)) return;

        setCurrentBadgeCode(null);
    }, [currentBadgeCode, filteredBadgeCodes]);

    return (
        <div className={`octane-catalog-badge-selector ${className}`.trim()}>
            <div className="octane-catalog-badge-search">
                <input
                    aria-label={LocalizeText('generic.search')}
                    maxLength={MAX_SEARCH_LENGTH}
                    placeholder={LocalizeText('generic.search')}
                    role="searchbox"
                    type="text"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value.slice(0, MAX_SEARCH_LENGTH))}
                    onKeyDown={(event) => {
                        if (event.key !== 'Escape') return;

                        event.preventDefault();
                        setSearchText('');
                    }}
                />
                {!!searchText.length && (
                    <button
                        aria-label={LocalizeText('generic.clear')}
                        className="octane-catalog-badge-search-clear"
                        type="button"
                        onClick={() => setSearchText('')}
                    >
                        ×
                    </button>
                )}
            </div>
            <ClassicScrollAreaView className="octane-catalog-badge-scroll-area" scrollStep={45}>
                <AutoGrid
                    aria-label={LocalizeText('catalog_selectbadge')}
                    className="octane-catalog-badge-grid"
                    columnCount={columnCount}
                    columnMinHeight={44}
                    columnMinWidth={44}
                    overflow="visible"
                    role="listbox"
                    {...rest}
                >
                    {filteredBadgeCodes.map((badgeCode) => (
                        <LayoutGridItem
                            key={badgeCode}
                            aria-label={badgeCode}
                            aria-selected={currentBadgeCode === badgeCode}
                            className="octane-catalog-badge-tile"
                            itemActive={currentBadgeCode === badgeCode}
                            role="option"
                            title={LocalizeBadgeName(badgeCode)}
                            onClick={() => setCurrentBadgeCode(badgeCode)}
                        >
                            <LayoutBadgeImageView badgeCode={badgeCode} showInfo />
                        </LayoutGridItem>
                    ))}
                </AutoGrid>
                {!filteredBadgeCodes.length && <div className="octane-catalog-badge-empty">{LocalizeText('inventory.empty.title')}</div>}
            </ClassicScrollAreaView>
        </div>
    );
};
