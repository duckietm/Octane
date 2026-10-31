import { GetConfiguration } from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { AIR_SPLASH_BG, AIR_SPLASH_TOP, AIR_USER_PHOTOS } from '@/assets/images/loading/air';
import octaneLogo from '@/assets/images/loading/octane-logo.png';
import '@/css/loading/LoadingView.css';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

interface LoadingViewProps {
    isError?: boolean;
    message?: string;
    homeUrl?: string;
    progress?: number;
    currentTask?: string;
}

/** AIR's English client.starting.revolving; a hotel sets its own in ui-config (the texts are not loaded yet). */
const AIR_REVOLVING_TEXT =
    'For science, you monster/Loading funny message…please wait./Would you like fries with that?/Follow the yellow duck./' +
    'Time is just an illusion./Are we there yet?!/I like your t-shirt./Look left. Look right. Blink twice. Ta da!/' +
    "It's not you, it's me./Shhh! I'm trying to think here./Loading pixel universe.";

/** AIR changes the message each time its bar fills: about every 2.25 s. */
const REVOLVING_INTERVAL_MS = 2250;

/** A configuration value, without the missing-key warning: the loading screen runs before most config is read. */
const configString = (key: string, fallback = ''): string => {
    try {
        const configuration = GetConfiguration();

        if (!configuration.definitions.has(key)) return fallback;

        const raw = configuration.getValue<string>(key, '');

        return raw ? configuration.interpolate(raw) || raw : fallback;
    } catch {
        return fallback;
    }
};

const randomIndex = (length: number) => Math.floor(Math.random() * length);

/**
 * AIR HabboLoadingScreen: on its dark background the photo splash (PhotoSplashScreen: the frame, one of 30 user
 * photos at 96, 51, the frame's top), 50 px under it a revolving message (client.starting.revolving), the 400 x 25
 * bar and the percentage. Ours adds the hotel logo top left (280 wide; `loading.logo.url`) and the current task
 * under the percentage. A failed load shows client.loading.failed with the error in AIR's error colour.
 */
export const LoadingView: FC<LoadingViewProps> = (props) => {
    const { isError = false, message = '', homeUrl = '', progress, currentTask = '' } = props;

    const logoUrl = useMemo(() => configString('loading.logo.url') || octaneLogo, []);
    const customBackground = useMemo(() => configString('loading.background'), []);
    const photo = useMemo(() => AIR_USER_PHOTOS[randomIndex(AIR_USER_PHOTOS.length)], []);
    const messages = useMemo(
        () =>
            configString('client.starting.revolving', AIR_REVOLVING_TEXT)
                .split('/')
                .map((text) => text.trim())
                .filter(Boolean),
        []
    );
    const [messageIndex, setMessageIndex] = useState(() => randomIndex(Math.max(1, messages.length)));

    useEffect(() => {
        if (isError || messages.length < 2) return;

        const interval = window.setInterval(() => setMessageIndex((index) => (index + 1) % messages.length), REVOLVING_INTERVAL_MS);

        return () => window.clearInterval(interval);
    }, [isError, messages.length]);

    const clampedProgress = typeof progress === 'number' && Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : null;
    const headline = isError ? configString('client.loading.failed', 'Loading failed') : (messages[messageIndex] ?? message);

    return (
        <NativeTextTree>
            <div className="octane-loading" style={customBackground ? { background: customBackground } : undefined}>
                <img src={logoUrl} alt="Octane" draggable={false} className="octane-loading__logo" />
                <div className="octane-loading__stack">
                    <div className="octane-loading__splash" aria-hidden="true">
                        <img src={AIR_SPLASH_BG} alt="" draggable={false} />
                        {photo && <img src={photo} alt="" draggable={false} className="octane-loading__photo" />}
                        <img src={AIR_SPLASH_TOP} alt="" draggable={false} />
                    </div>
                    <div className="octane-loading__text" role="status">
                        {headline}
                    </div>
                    {isError ? (
                        <div className="octane-loading__error">
                            {message && <div>{message}</div>}
                            {homeUrl && (
                                <a href={homeUrl} className="octane-loading__home">
                                    Back to Hotel
                                </a>
                            )}
                        </div>
                    ) : (
                        <>
                            <div
                                className="octane-loading__bar"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={clampedProgress ?? undefined}
                            >
                                <div className="octane-loading__track">
                                    <div className="octane-loading__fill" style={{ width: `${clampedProgress ?? 0}%` }} />
                                </div>
                            </div>
                            <div className="octane-loading__percent">{clampedProgress !== null ? `${clampedProgress}%` : ''}</div>
                            {currentTask && <div className="octane-loading__task">{currentTask}</div>}
                        </>
                    )}
                </div>
            </div>
        </NativeTextTree>
    );
};
