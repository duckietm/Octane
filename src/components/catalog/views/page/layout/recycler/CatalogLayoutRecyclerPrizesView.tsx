import {
    GetRecyclerPrizesMessageComposer,
    RecyclerPrizeLevel,
    RecyclerPrizesMessageEvent
} from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { GetFurnitureData, LocalizeText, SendMessageComposer } from '../../../../../../api';
import { LayoutFurniImageView } from '../../../../../../common';
import { useMessageEvent } from '../../../../../../hooks';
import { CatalogLayoutProps } from '../CatalogLayout.types';

export const CatalogLayoutRecyclerPrizesView: FC<CatalogLayoutProps> = () => {
    const [levels, setLevels] = useState<RecyclerPrizeLevel[] | null>(null);

    useMessageEvent<RecyclerPrizesMessageEvent>(RecyclerPrizesMessageEvent, (event) => {
        setLevels([...event.getParser().levels].sort((first, second) => first.levelId - second.levelId));
    });

    useEffect(() => {
        SendMessageComposer(new GetRecyclerPrizesMessageComposer());
    }, []);

    if (!levels) {
        return <div className="octane-catalog-specialized-state" role="status">{LocalizeText('generic.loading')}</div>;
    }

    if (!levels.length) {
        return <div className="octane-catalog-specialized-state" role="status">{LocalizeText('recycler.info.closed')}</div>;
    }

    return (
        <div className="octane-catalog-recycler-prizes">
            <h2>{LocalizeText('recycler.prizes.title')}</h2>
            {levels.map((level) => (
                <section key={level.levelId} className="octane-catalog-recycler-prize-level">
                    <header>
                        <strong>{LocalizeText(`recycler.prizes.category.${level.levelId}`)}</strong>
                        <span>{LocalizeText(`recycler.prizes.odds.${level.levelId}`, ['odds'], [level.chance.toString()])}</span>
                    </header>
                    <div className="octane-catalog-recycler-prize-grid">
                        {level.products.map((product, index) => {
                            const name = GetFurnitureData(product.productClassId, product.productType)?.name || product.name;

                            return (
                                <div key={`${product.name}-${product.productClassId}-${index}`} className="octane-catalog-recycler-prize">
                                    <LayoutFurniImageView productClassId={product.productClassId} productType={product.productType} />
                                    <span>{name}</span>
                                    {product.count > 1 && <small>x{product.count}</small>}
                                </div>
                            );
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
};
