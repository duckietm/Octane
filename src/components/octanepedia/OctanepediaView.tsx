import { AddLinkEventTracker, ILinkEventTracker, OctaneLogger, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { getActiveTextLocale, GetConfigurationValue, GetOptionalConfigurationValue, habboPageCandidates, OpenUrl, resolveHabboPageUrl, SanitizePageHtml } from '../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';
import '../../css/octanepedia/OctanepediaAirText.css';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { getClickedAnchor } from './getClickedAnchor';
import { fetchHabboPage } from './fetchHabboPage';
import { createLatestRequest } from './latestRequest';

const NEW_LINE_REGEX = /\n\r|\n|\r/gm;
/** Help pages shipped in the client's own public folder. */
const BUNDLED_PAGES = 'habbopages/';

export const OctanepediaView: FC<{}> = (props) => {
    const [content, setContent] = useState<string>(null);
    const [header, setHeader] = useState<string>('');
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>(null);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const latest = createLatestRequest();

        const openPage = async (links: ReadonlyArray<string | null>) => {
            const signal = latest.start();

            try {
                const text = await fetchHabboPage(links, signal);

                if (text === null || signal.aborted) return;

                // A newer page was asked for meanwhile: this one is not shown over it.
                if (signal.aborted) return;
                const splitData = text.split(NEW_LINE_REGEX);
                const line = splitData.shift().split('|');

                setHeader(line[0]);

                setDimensions((prevValue) => {
                    if (line[1] && line[1].split(';').length === 2) {
                        const [width, height] = line[1].split(';').map((value) => parseInt(value, 10));

                        if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) return { width, height };
                    }

                    return null;
                });

                setContent(SanitizePageHtml(splitData.join('')));
            } catch (error) {
                if (signal.aborted) return;

                OctaneLogger.error(`Failed to fetch help page ${links[0]}`);
            }
        };

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const value = url.split('/');

                if (value.length < 2) return;

                value.shift();

                const path = value.join('/');
                // A page is one file per language: the player's language first, then the hotel's, then English, then
                // where pages were kept before. The hotel's own pages win; those shipped with the client stand in.
                const candidates = habboPageCandidates(path, getActiveTextLocale(), GetOptionalConfigurationValue<string>('base.locale', 'en'));
                const hotelBase = GetConfigurationValue<string>('habbopages.url');
                const links = [
                    ...candidates.map((candidate) => resolveHabboPageUrl(hotelBase, candidate)),
                    ...candidates.map((candidate) => resolveHabboPageUrl(BUNDLED_PAGES, candidate, document.baseURI))
                ].filter(Boolean);

                if (!links.length) {
                    OctaneLogger.warn(`Refused help page path "${path}"`);
                    return;
                }

                openPage(links);
            },
            eventUrlPrefix: 'habbopages/'
        };

        AddLinkEventTracker(linkTracker);

        return () => {
            RemoveLinkEventTracker(linkTracker);
            latest.abort();
        };
    }, []);

    useEffect(() => {
        const handle = (event: MouseEvent) => {
            const anchor = getClickedAnchor(event.target);

            if (!anchor) return;

            // Only the links inside this window: the listener sits on the document, so without
            // this check it opened every link in the client (the profile's unblock link, chat
            // links...) in a new browser page, even with Octanepedia closed.
            if (!elementRef.current?.contains(anchor)) return;

            event.preventDefault();

            const link = anchor.href;

            if (!link || !link.length) return;

            OpenUrl(link);
        };

        document.addEventListener('click', handle);

        return () => {
            document.removeEventListener('click', handle);
        };
    }, []);

    if (!content) return null;

    return (
        <NativeTextTree>
            <OctaneCardView
                className="octanepedia w-[450px] h-[400px] max-w-[90vw] max-h-[85vh]"
                style={dimensions ? { width: dimensions.width, height: dimensions.height } : {}}
                theme="primary-slim">
                <OctaneCardHeaderView headerText={header} onCloseClick={() => setContent(null)} />
                <OctaneCardContentView>
                    <div ref={elementRef} className="octanepedia__page text-black size-full" dangerouslySetInnerHTML={{ __html: content }} />
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
