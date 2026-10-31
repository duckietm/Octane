import { GetRecyclerPrizesMessageComposer, RecyclerPrizeLevel, RecyclerPrizesMessageEvent } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetFurnitureData, GetImageIconUrlForProduct, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../../../../api';
import { LayoutFurniImageView } from '../../../../../../common';
import { BaseButton } from '../../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../../common/native-text/NativeTextTree';
import { useMessageEvent } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';

/** AIR RecyclerPrizesCatalogWidget STAR_LEVELS, as colours (the star_small_* images are not shipped). */
const STAR_COLOURS = ['#cd7f32', '#c0c0c0', '#ffcc00', '#9ee7ff', '#e0115f', '#ff8fd6', '#3fbf3f', '#8c8c8c'];

type RecyclerPrize = RecyclerPrizeLevel['products'][number];

/** Used only when the hotel's texts lack recycler.prizes.category.N (level 6, mythic, is not an AIR level). */
const CATEGORY_FALLBACK = ['Common', 'Uncommon', 'Rare', 'Very rare', 'Legendary', 'Mythic'];

const prizeName = (prize: RecyclerPrize) => GetFurnitureData(prize.productClassId, prize.productType)?.name || prize.name;

/** The furni's catalog icon (AIR's level item shows the product icon): a plain image, so it is never cut or rescaled. */
const PrizeIcon: FC<{ prize: RecyclerPrize }> = ({ prize }) => {
    const iconUrl = GetImageIconUrlForProduct(prize.productType, prize.productClassId);

    if (!iconUrl) return <LayoutFurniImageView productClassId={prize.productClassId} productType={prize.productType} />;

    return <img alt="" draggable={false} src={iconUrl} />;
};

/**
 * AIR layout_recycler_prizes_xml + recyclerPrizesWidgetLevelItem_xml, full width on the catalog page: the 240 px high
 * product view shows the page teaser, or the chosen prize with its name; under it one row per level with its star,
 * category and odds (`recycler.prizes.odds`, 1:N, not for level 1) over the level's prize icons.
 */
export const CatalogLayoutRecyclerPrizesView: FC<CatalogLayoutProps> = ({ page }) => {
    const [levels, setLevels] = useState<RecyclerPrizeLevel[] | null>(null);
    const [selected, setSelected] = useState<RecyclerPrize | null>(null);

    useMessageEvent<RecyclerPrizesMessageEvent>(RecyclerPrizesMessageEvent, (event) => {
        setLevels([...event.getParser().levels].sort((first, second) => first.levelId - second.levelId));
    });

    useEffect(() => {
        SendMessageComposer(new GetRecyclerPrizesMessageComposer());
    }, []);

    if (!levels) {
        return (
            <NativeTextTree>
                <div className="octane-catalog-specialized-state" role="status">
                    {LocalizeText('generic.loading')}
                </div>
            </NativeTextTree>
        );
    }

    if (!levels.length) {
        return (
            <NativeTextTree>
                <div className="octane-catalog-specialized-state" role="status">
                    {LocalizeText('recycler.info.closed')}
                </div>
            </NativeTextTree>
        );
    }

    const teaser = page?.localization?.getImage(1);

    return (
        <NativeTextTree>
            <div className="octane-catalog-air-prizes">
                <div className="octane-catalog-air-prizes__view">
                    {selected ? (
                        <>
                            <div className="octane-catalog-air-prizes__preview">
                                <LayoutFurniImageView direction={2} productClassId={selected.productClassId} productType={selected.productType} scale={2} />
                            </div>
                            <div className="octane-catalog-air-prizes__name">{prizeName(selected)}</div>
                        </>
                    ) : (
                        !!teaser && <img alt="" draggable={false} className="octane-catalog-air-prizes__teaser" src={teaser} />
                    )}
                </div>
                <div className="octane-catalog-air-prizes__list">
                    {levels.map((level) => (
                        <section key={level.levelId} className="octane-catalog-air-prizes__level">
                            <header className="octane-catalog-air-prizes__level-head">
                                <span
                                    aria-hidden="true"
                                    className="octane-catalog-air-prizes__star"
                                    style={{ color: STAR_COLOURS[level.levelId - 1] ?? STAR_COLOURS[7] }}
                                >
                                    ★
                                </span>
                                <strong>
                                    {localizeWithFallback(
                                        `recycler.prizes.category.${level.levelId}`,
                                        CATEGORY_FALLBACK[level.levelId - 1] ?? `${level.levelId}`
                                    )}
                                </strong>
                                {level.levelId > 1 && <span> - {LocalizeText('recycler.prizes.odds', ['odds'], [`1:${level.chance}`])}</span>}
                            </header>
                            <div className="octane-catalog-air-prizes__items">
                                {level.products.map((prize, index) => (
                                    <BaseButton
                                        key={`${prize.name}-${prize.productClassId}-${index}`}
                                        aria-label={prizeName(prize)}
                                        aria-pressed={selected === prize}
                                        className={`octane-catalog-air-prizes__item${selected === prize ? ' is-selected' : ''}`}
                                        onClick={() => setSelected(prize)}
                                    >
                                        <PrizeIcon prize={prize} />
                                        {prize.count > 1 && <small>x{prize.count}</small>}
                                    </BaseButton>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </NativeTextTree>
    );
};
