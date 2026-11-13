import { AddLinkEventTracker, ILinkEventTracker, OctaneLogger, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, OpenUrl, resolveHabboPageUrl, SanitizePageHtml } from '../../api';
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

        const openPage = async (link: string, bundledLink: string | null) => {
            const signal = latest.start();

            try {
                const text = await fetchHabboPage([link, bundledLink], signal);

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

                OctaneLogger.error(`Failed to fetch ${link}`);
            }
        };

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const value = url.split('/');

                if (value.length < 2) return;

                value.shift();

                const link = resolveHabboPageUrl(GetConfigurationValue<string>('habbopages.url'), value.join('/'));

                if (!link) {
                    OctaneLogger.warn(`Refused help page path "${value.join('/')}"`);
                    return;
                }

                // The hotel's own page wins; the pages that ship with the client stand in when it has none.
                openPage(link, resolveHabboPageUrl(BUNDLED_PAGES, value.join('/'), document.baseURI));
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
