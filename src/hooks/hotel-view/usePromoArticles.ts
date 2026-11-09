import { GetPromoArticlesComposer, PromoArticleData, PromoArticlesMessageEvent } from '@octane/renderer';
import { useEffect, useState } from 'react';
import { SendMessageComposer } from '../../api';
import { PROMO_ARTICLE_MAX, PROMO_ARTICLE_REFRESH_MS } from '../../api/hotel-view/LandingViewWidgets';
import { useMessageEvent } from '../events';

/**
 * PromoArticleWidget: the news articles of the hotel view (GetPromoArticles 1827 -> PromoArticles
 * 286), asked again every ten minutes while the hotel view is shown.
 */
export const usePromoArticles = () => {
    const [articles, setArticles] = useState<PromoArticleData[]>([]);

    useMessageEvent<PromoArticlesMessageEvent>(PromoArticlesMessageEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        setArticles((parser.articles ?? []).slice(0, PROMO_ARTICLE_MAX));
    });

    useEffect(() => {
        SendMessageComposer(new GetPromoArticlesComposer());

        const interval = window.setInterval(() => SendMessageComposer(new GetPromoArticlesComposer()), PROMO_ARTICLE_REFRESH_MS);

        return () => window.clearInterval(interval);
    }, []);

    return { articles };
};
