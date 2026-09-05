import { AddLinkEventTracker, ILinkEventTracker, OctaneLogger, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useRef, useState } from 'react';
import { GetConfigurationValue, OpenUrl } from '../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../common';

const NEW_LINE_REGEX = /\n\r|\n|\r/gm;

export const OctanepediaView: FC<{}> = (props) => {
    const [content, setContent] = useState<string>(null);
    const [header, setHeader] = useState<string>('');
    const [dimensions, setDimensions] = useState<{ width: number; height: number }>(null);
    const elementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const openPage = async (link: string) => {
            try {
                const response = await fetch(link);

                if (!response) return;

                const text = await response.text();
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

                setContent(splitData.join(''));
            } catch (error) {
                OctaneLogger.error(`Failed to fetch ${link}`);
            }
        };

        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const value = url.split('/');

                if (value.length < 2) return;

                value.shift();

                openPage(GetConfigurationValue<string>('habbopages.url') + value.join('/'));
            },
            eventUrlPrefix: 'habbopages/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        const handle = (event: MouseEvent) => {
            if (!(event.target instanceof HTMLAnchorElement)) return;

            event.preventDefault();

            const link = event.target.href;

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
        <OctaneCardView
            className="octanepedia w-[450px] h-[400px] max-w-[90vw] max-h-[85vh]"
            style={dimensions ? { width: dimensions.width, height: dimensions.height } : {}}
            theme="primary-slim">
            <OctaneCardHeaderView headerText={header} onCloseClick={() => setContent(null)} />
            <OctaneCardContentView>
                <div ref={elementRef} className="text-black size-full" dangerouslySetInnerHTML={{ __html: content }} />
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
