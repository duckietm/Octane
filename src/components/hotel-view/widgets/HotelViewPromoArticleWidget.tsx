import { CreateLinkEvent } from '@octane/renderer';
import { FC, ReactNode, useState } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';
import { isPromoArticleButtonVisible, PROMO_LINK_INTERNAL, PROMO_LINK_URL, wrapPromoArticleIndex } from '../../../api/hotel-view/LandingViewWidgets';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { usePromoArticles } from '../../../hooks';

/**
 * PromoArticleWidget (promo_article.xml): the news carousel. One article at a time with its image
 * from the image library, a navigation disk per article, and a button that opens a web page or an
 * in-client link. Before the first answer the slot keeps its own texts.
 */
export const HotelViewPromoArticleWidget: FC<{ fallback: ReactNode }> = ({ fallback }) => {
    const { articles = [] } = usePromoArticles();
    const [index, setIndex] = useState(0);
    const [fading, setFading] = useState(false);
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');

    if (!articles.length) return <>{fallback}</>;

    const current = Math.min(index, articles.length - 1);
    const article = articles[current];

    const select = (next: number) => {
        const target = wrapPromoArticleIndex(next, articles.length);

        if (target === current) return;

        setFading(true);
        window.setTimeout(() => {
            setIndex(target);
            setFading(false);
        }, 250);
    };

    const open = () => {
        if (article.linkType === PROMO_LINK_URL && /^https?:\/\//i.test(article.linkContent ?? '')) window.open(article.linkContent, '_blank', 'noopener,noreferrer');
        else if (article.linkType === PROMO_LINK_INTERNAL && article.linkContent) CreateLinkEvent(article.linkContent);
    };

    return (
        <NativeTextTree>
            <div className="hotelview-promo-article">
                <div className="hotelview-promo-article-header">
                    <span>{localizeWithFallback('landing.view.promo.article.header', 'Latest news')}</span>
                    <div className="hotelview-promo-article-navigation">
                        {articles.map((value, position) => (
                            <BaseButton
                                key={value.id}
                                type="button"
                                className={`hotelview-promo-article-disk${position === current ? ' hotelview-promo-article-disk-on' : ''}`}
                                aria-label={value.title}
                                onClick={() => select(position)}
                            />
                        ))}
                    </div>
                </div>
                <div className={`hotelview-promo-article-body${fading ? ' hotelview-promo-article-fading' : ''}`}>
                    {article.imageUrl && <img className="hotelview-promo-article-image" src={`${imageLibraryUrl}${article.imageUrl}`} alt="" draggable={false} />}
                    <div className="hotelview-promo-article-copy">
                        <h2>{article.title}</h2>
                        <p>{article.bodyText}</p>
                        {isPromoArticleButtonVisible(article.linkType, article.linkContent) && (
                            <BaseButton type="button" className="hotelview-widget-button" onClick={open}>
                                {article.buttonText}
                            </BaseButton>
                        )}
                    </div>
                </div>
            </div>
        </NativeTextTree>
    );
};
