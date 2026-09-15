import type { PromoArticleData } from '@octane/renderer';
import { GetPromoArticlesComposer, HabboWebTools, PromoArticlesMessageEvent } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { CreateLinkEvent, GetConfigurationValue, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../../hooks';
import {
    isPromoArticleButtonVisible,
    PROMO_ARTICLE_FADE_MS,
    PROMO_ARTICLE_MAX_NAVIGATION_DISKS,
    PromoArticleLinkType,
    shouldRequestPromoArticles,
    wrapPromoArticleIndex
} from '../hotelViewWidgets';

export interface HotelViewPromoArticleWidgetProps {
    /** Header of the widget; the official `landing.view.promo.article.header` when empty. */
    headerText?: string;
}

type FadePhase = 'idle' | 'out' | 'in';

/**
 * `PromoArticleWidget.as` + the `promo_article` layout (500x118): a header row,
 * one navigation disk per article (max 10), and the current article with its
 * image, title, body and link button. Articles come from `GetPromoArticles`
 * (re-requested every 10 minutes) and switch with a 500 ms fade.
 */
export const HotelViewPromoArticleWidget: FC<HotelViewPromoArticleWidgetProps> = (props) => {
    const { headerText = '' } = props;
    const [articles, setArticles] = useState<PromoArticleData[]>([]);
    const [index, setIndex] = useState(0);
    const [visibleIndex, setVisibleIndex] = useState(0);
    const [fadePhase, setFadePhase] = useState<FadePhase>('idle');
    const [hoveredDisk, setHoveredDisk] = useState(-1);
    const lastRequestTimeRef = useRef<number | null>(null);
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    useEffect(() => {
        const now = Date.now();

        if (!shouldRequestPromoArticles(lastRequestTimeRef.current, now)) return;

        lastRequestTimeRef.current = now;
        SendMessageComposer(new GetPromoArticlesComposer());
    }, []);

    useMessageEvent<PromoArticlesMessageEvent>(PromoArticlesMessageEvent, (event) => {
        const parser = event.getParser();

        setArticles([...(parser?.articles ?? [])]);
    });

    useEffect(() => {
        setIndex((current) => wrapPromoArticleIndex(current, articles.length));
        setVisibleIndex((current) => wrapPromoArticleIndex(current, articles.length));
    }, [articles]);

    useEffect(() => {
        if (fadePhase !== 'out') return;

        const swapTimer = window.setTimeout(() => {
            setVisibleIndex(index);
            setFadePhase('in');
        }, PROMO_ARTICLE_FADE_MS);

        return () => window.clearTimeout(swapTimer);
    }, [fadePhase, index]);

    useEffect(() => {
        if (fadePhase !== 'in') return;

        const doneTimer = window.setTimeout(() => setFadePhase('idle'), PROMO_ARTICLE_FADE_MS);

        return () => window.clearTimeout(doneTimer);
    }, [fadePhase]);

    const goToArticle = (target: number) => {
        if (!articles.length) return;

        const next = wrapPromoArticleIndex(target, articles.length);

        if (next === index) return;

        setIndex(next);
        setFadePhase('out');
    };

    const article = articles[visibleIndex] ?? null;

    const followLink = () => {
        if (!article) return;

        switch (article.linkType) {
            case PromoArticleLinkType.WEB:
                HabboWebTools.openWebPage(article.linkContent);
                return;
            case PromoArticleLinkType.CLIENT:
                CreateLinkEvent(article.linkContent);
                return;
        }
    };

    const header = headerText || localizeWithFallback('landing.view.promo.article.header', 'News');
    const diskTooltip = localizeWithFallback('promo.article.widget.tooltip.go.to.article', 'Go to article');
    const showButton = !!article && isPromoArticleButtonVisible(article.linkType, article.linkContent);

    return (
        <div className="hotelview-promo-article">
            <div className="hotelview-widget-header">
                <i className="hotelview-widget-header__bar" aria-hidden="true" />
                <span className="hotelview-widget-header__text">{header}</span>
                <i className="hotelview-widget-header__line" aria-hidden="true" />
            </div>
            <div className="hotelview-promo-article__navigation">
                {articles.slice(0, PROMO_ARTICLE_MAX_NAVIGATION_DISKS).map((item, itemIndex) => (
                    <button
                        key={item.id}
                        type="button"
                        className={`hotelview-promo-article__disk${itemIndex === index || itemIndex === hoveredDisk ? ' is-on' : ''}`}
                        title={diskTooltip}
                        aria-label={diskTooltip}
                        aria-current={itemIndex === index}
                        onMouseEnter={() => setHoveredDisk(itemIndex)}
                        onMouseLeave={() => setHoveredDisk(-1)}
                        onClick={() => goToArticle(itemIndex)}
                    />
                ))}
            </div>
            <div className={`hotelview-promo-article__article${fadePhase === 'out' ? ' is-fading' : ''}`}>
                {article?.imageUrl && <img className="hotelview-promo-article__image" src={`${imageLibraryUrl}${article.imageUrl}`} alt="" />}
                <div className="hotelview-promo-article__content">
                    <h2>{article ? article.title : LocalizeText('promo.article.widget.loading')}</h2>
                    {article && <p>{article.bodyText}</p>}
                    {showButton && (
                        <button type="button" className="hotelview-widget-button" onClick={followLink}>
                            {article.buttonText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
