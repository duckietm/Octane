import { FC } from 'react';
import { localizeWithFallback } from '../../../../api';
import { BaseButton } from '../../../../common/BaseButton';

/** The small drawn pictures of the phone forum: one stroke weight, the colour of the text around them. */
const ICON_PATHS: Record<string, string> = {
    back: 'M10 3 L5 8 L10 13',
    forward: 'M6 3 L11 8 L6 13',
    first: 'M12 3 L7 8 L12 13 M4 3 L4 13',
    last: 'M4 3 L9 8 L4 13 M12 3 L12 13',
    more: 'M3.5 8 L3.6 8 M8 8 L8.1 8 M12.5 8 L12.6 8',
    lock: 'M4 7.5 H12 V13 H4 Z M5.5 7.5 V5.5 A2.5 2.5 0 0 1 10.5 5.5 V7.5',
    unlock: 'M4 7.5 H12 V13 H4 Z M5.5 7.5 V5.5 A2.5 2.5 0 0 1 10.3 4.6',
    pin: 'M6 2.5 H10 L9.5 7 L11.5 9.5 H4.5 L6.5 7 Z M8 9.5 V14',
    hide: 'M2 8 C4 4.5 12 4.5 14 8 C12 11.5 4 11.5 2 8 Z M3 13 L13 3',
    show: 'M2 8 C4 4.5 12 4.5 14 8 C12 11.5 4 11.5 2 8 Z M8 7 L8.1 7.1',
    report: 'M4 14 V2.5 M4 3 H12 L10 6 L12 9 H4',
    quote: 'M3 4 H13 V10.5 H8 L5 13 V10.5 H3 Z',
    settings:
        'M8 5.5 A2.5 2.5 0 1 0 8 10.5 A2.5 2.5 0 1 0 8 5.5 M8 1.5 V3 M8 13 V14.5 M1.5 8 H3 M13 8 H14.5 M3.4 3.4 L4.5 4.5 M11.5 11.5 L12.6 12.6 M3.4 12.6 L4.5 11.5 M11.5 4.5 L12.6 3.4',
    help: 'M5.5 6 A2.5 2.5 0 1 1 8 8.5 V10 M8 12.5 L8 12.6'
};

export type ForumIconName = keyof typeof ICON_PATHS;

export const ForumIcon: FC<{ name: ForumIconName; label?: string }> = ({ name, label }) => (
    <svg
        aria-hidden={label ? undefined : true}
        aria-label={label}
        className={`octane-handheld-forum__icon is-${name}`}
        role={label ? 'img' : undefined}
        viewBox="0 0 16 16"
    >
        <path d={ICON_PATHS[name]} />
    </svg>
);

interface ForumPagesProps {
    pageIndex: number;
    pageCount: number;
    onPage: (pageIndex: number) => void;
}

/**
 * The pages of a list, at the end of what is scrolled: first / previous, "n / total", next / last, each a finger wide.
 * The same rule as the desktop pager: back from the second page on, forward up to the one before the last. A list of
 * one page has nowhere to go, so it shows none.
 */
export const HandheldForumPages: FC<ForumPagesProps> = ({ pageIndex, pageCount, onPage }) => {
    if (pageCount <= 1) return null;

    const canGoBack = pageIndex > 0;
    const canGoForward = pageIndex < pageCount - 1;

    return (
        <nav aria-label={localizeWithFallback('octane.handheld.forum.pages', 'Pages')} className="octane-handheld-forum__pages">
            <BaseButton
                aria-label={localizeWithFallback('octane.handheld.forum.page.first', 'First page')}
                className="octane-handheld-forum__page-button"
                disabled={!canGoBack}
                onClick={() => onPage(0)}
            >
                <ForumIcon name="first" />
            </BaseButton>
            <BaseButton
                aria-label={localizeWithFallback('octane.handheld.forum.page.previous', 'Previous page')}
                className="octane-handheld-forum__page-button"
                disabled={!canGoBack}
                onClick={() => onPage(pageIndex - 1)}
            >
                <ForumIcon name="back" />
            </BaseButton>
            <span className="octane-handheld-forum__page-count">{`${pageIndex + 1} / ${pageCount}`}</span>
            <BaseButton
                aria-label={localizeWithFallback('octane.handheld.forum.page.next', 'Next page')}
                className="octane-handheld-forum__page-button"
                disabled={!canGoForward}
                onClick={() => onPage(pageIndex + 1)}
            >
                <ForumIcon name="forward" />
            </BaseButton>
            <BaseButton
                aria-label={localizeWithFallback('octane.handheld.forum.page.last', 'Last page')}
                className="octane-handheld-forum__page-button"
                disabled={!canGoForward}
                onClick={() => onPage(pageCount - 1)}
            >
                <ForumIcon name="last" />
            </BaseButton>
        </nav>
    );
};
