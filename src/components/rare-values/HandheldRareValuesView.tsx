import { IRareValue } from '@octane/renderer';
import { FC, RefObject } from 'react';
import { LocalizeFormattedNumber, LocalizeText } from '../../api';
import { LayoutCurrencyIcon, LayoutImage } from '../../common';
import { DraggableWindow } from '../../common/draggable-window';
import { HandheldSheetFrame } from '../../common/handheld/HandheldSheetFrame';

export interface HandheldRareValueRow {
    spriteId: number;
    name: string;
    iconUrl: string;
    value: IRareValue;
}

interface HandheldRareValuesViewProps {
    loaded: boolean;
    searchValue: string;
    onSearch: (value: string) => void;
    rows: HandheldRareValueRow[];
    total: number;
    hasMore: boolean;
    scrollRef: RefObject<HTMLDivElement>;
    sentinelRef: RefObject<HTMLDivElement>;
    onClose: () => void;
}

/**
 * The rare values on a phone: a sheet with a 16 px search pill, the count, and every rare as a card (picture, name,
 * value with its currency), two columns on its side. RareValuesView keeps the data, the filter and the paging; the list
 * here is the scroll root its sentinel grows the page from.
 */
export const HandheldRareValuesView: FC<HandheldRareValuesViewProps> = ({
    loaded,
    searchValue,
    onSearch,
    rows,
    total,
    hasMore,
    scrollRef,
    sentinelRef,
    onClose
}) => {
    const title = LocalizeText('rarevalues.title');

    return (
        <DraggableWindow handheldSheet uniqueKey="rare-values">
            <HandheldSheetFrame className="octane-handheld-rx octane-handheld-rx-rares" icon="icon-rare-values" title={title} onClose={onClose}>
                <div className="octane-handheld-rx__toolbar">
                    <span aria-hidden="true" className="octane-handheld-rx__search-icon" />
                    <input
                        aria-label={LocalizeText('generic.search')}
                        className="octane-handheld-rx__input is-search"
                        enterKeyHint="search"
                        placeholder={LocalizeText('generic.search')}
                        type="search"
                        value={searchValue}
                        onChange={(event) => onSearch(event.target.value)}
                    />
                </div>
                {loaded && (
                    <div className="octane-handheld-rx__meta">
                        <span>
                            {total} {title.toLowerCase()}
                        </span>
                        {hasMore && (
                            <span>
                                {rows.length} / {total}
                            </span>
                        )}
                    </div>
                )}
                <div ref={scrollRef} className="octane-handheld-rx__scroll" data-testid="handheld-rare-values">
                    {!loaded && <p className="octane-handheld-rx__empty">{LocalizeText('rarevalues.loading')}</p>}
                    {loaded && !total && <p className="octane-handheld-rx__empty">{LocalizeText('rarevalues.empty')}</p>}
                    {!!rows.length && (
                        <ul className="octane-handheld-rx-rares__list">
                            {rows.map((row) => (
                                <li key={row.spriteId} className="octane-handheld-rx-rares__card">
                                    <span className="octane-handheld-rx-rares__picture">
                                        <LayoutImage className="octane-handheld-rx-rares__image" imageUrl={row.iconUrl} />
                                    </span>
                                    <span className="octane-handheld-rx-rares__name">{row.name}</span>
                                    <span className="octane-handheld-rx-rares__value">
                                        <span>{LocalizeFormattedNumber(row.value.points)}</span>
                                        <LayoutCurrencyIcon type={row.value.pointsType} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {hasMore && (
                        <div ref={sentinelRef} className="octane-handheld-rx__more">
                            {LocalizeText('rarevalues.loading.more')}
                        </div>
                    )}
                </div>
            </HandheldSheetFrame>
        </DraggableWindow>
    );
};
