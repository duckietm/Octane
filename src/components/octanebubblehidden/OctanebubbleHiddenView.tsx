import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';

export const OctanebubbleHiddenView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        document.body.classList.toggle('octane-bubbles-hidden', isVisible);

        return () => document.body.classList.remove('octane-bubbles-hidden');
    }, [isVisible]);

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 2) return;

                switch (parts[1]) {
                    case 'show':
                        setIsVisible(true);
                        return;
                    case 'hide':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                }
            },
            eventUrlPrefix: 'octanebubblehidden/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    return null;
};
