import { FC, useEffect, useState } from 'react';
import { interpolate, t } from '../utils/i18n';
import { resolveNewsImage, resolveNewsLink } from '../utils/news';

interface NewsItem {
    id: number;
    title: string;
    body: string;
    image: string | null;
    linkText: string;
    linkUrl: string;
}

interface RawNewsItem {
    id?: number;
    title?: string;
    body?: string;
    image?: string | null;
    link?: string;
    linkUrl?: string;
    linkText?: string;
}

const normalizeNewsItem = (raw: RawNewsItem, fallbackId: number): NewsItem => ({
    id: typeof raw.id === 'number' ? raw.id : fallbackId,
    title: typeof raw.title === 'string' ? raw.title : '',
    body: typeof raw.body === 'string' ? raw.body : '',
    image: typeof raw.image === 'string' && raw.image.length ? interpolate(raw.image) : null,
    linkText: typeof raw.linkText === 'string' ? raw.linkText : '',
    linkUrl: interpolate((typeof raw.linkUrl === 'string' && raw.linkUrl) || (typeof raw.link === 'string' ? raw.link : ''))
});

interface NewsWindowProps {
    newsUrl: string;
}

const NEWS_AUTO_ADVANCE_MS = 10000;

export const NewsWindow: FC<NewsWindowProps> = ({ newsUrl }) => {
    const [items, setItems] = useState<NewsItem[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [index, setIndex] = useState(0);
    const [autoTick, setAutoTick] = useState(0);

    useEffect(() => {
        if (!newsUrl) {
            setFailed(true);
            return;
        }
        let cancelled = false;
        const controller = new AbortController();

        fetch(newsUrl, { credentials: 'omit', signal: controller.signal })
            .then(async (r) => {
                if (!r.ok) throw new Error('status ' + r.status);
                return r.json();
            })
            .then((json: unknown) => {
                if (cancelled) return;
                const rawList = Array.isArray((json as { news?: unknown })?.news)
                    ? (json as { news: RawNewsItem[] }).news
                    : Array.isArray(json)
                      ? (json as RawNewsItem[])
                      : [];
                setItems(rawList.map((raw, idx) => normalizeNewsItem(raw, idx + 1)));
            })
            .catch(() => {
                if (!cancelled) setFailed(true);
            });
        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [newsUrl]);

    useEffect(() => {
        if (!items || items.length < 2) return;
        const id = window.setTimeout(() => {
            setIndex((i) => (i + 1) % items.length);
        }, NEWS_AUTO_ADVANCE_MS);
        return () => window.clearTimeout(id);
    }, [items, index, autoTick]);

    if (failed) return null;
    if (!items || !items.length) return null;

    const current = items[Math.min(index, items.length - 1)];
    const hasMany = items.length > 1;
    const bumpAuto = () => setAutoTick((t) => t + 1);
    const prev = () => {
        setIndex((i) => (i - 1 + items.length) % items.length);
        bumpAuto();
    };
    const next = () => {
        setIndex((i) => (i + 1) % items.length);
        bumpAuto();
    };

    const safeLinkUrl = resolveNewsLink(current.linkUrl);
    const safeImageSrc = resolveNewsImage(current.image);
    const openLink = () => {
        if (!safeLinkUrl) return;
        window.open(safeLinkUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="login-news-stack">
            <div className="news-card-wrapper" key={current.id}>
                <div className="octane-login-card octane-card-shell octane-news-card">
                    <div className="card-title octane-card-header-shell">
                        <span className="octane-card-title">{t('nitro.login.news.title', 'Hotel News')}</span>
                    </div>
                    <div className="card-body octane-card-content-shell news-body">
                        {safeImageSrc && (
                            <div className="news-image">
                                <img
                                    src={safeImageSrc}
                                    alt={current.title || 'news'}
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                        <div className="news-headline">{current.title}</div>
                        {current.body && <div className="news-text">{current.body}</div>}

                        <div className="news-footer">
                            {current.linkText && safeLinkUrl ? (
                                <button type="button" className="ok-button news-link-button" onClick={openLink}>
                                    {current.linkText}
                                </button>
                            ) : (
                                <span />
                            )}

                            {hasMany && (
                                <div className="news-pager">
                                    <button type="button" className="arrow-btn" aria-label="Previous news" onClick={prev}>
                                        &lsaquo;
                                    </button>
                                    <span className="news-counter">
                                        {index + 1}/{items.length}
                                    </span>
                                    <button type="button" className="arrow-btn" aria-label="Next news" onClick={next}>
                                        &rsaquo;
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
