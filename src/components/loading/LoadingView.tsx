import { GetConfiguration } from '@octane/renderer';
import { FC, useMemo } from 'react';
import octaneLogo from '@/assets/images/loading/octane-logo.png';
import { Base, Column, Text } from '../../common';

interface LoadingViewProps {
    isError?: boolean;
    message?: string;
    homeUrl?: string;
    progress?: number;
    currentTask?: string;
}

const resolveConfigUrl = (key: string): string => {
    try {
        const raw = GetConfiguration().getValue<string>(key, '');
        if (!raw) return '';

        const interpolated = GetConfiguration().interpolate(raw) || raw;
        return interpolated;
    } catch {
        return '';
    }
};

const resolveConfigString = (key: string, fallback = ''): string => {
    try {
        const raw = GetConfiguration().getValue<string>(key, '');
        if (!raw) return fallback;
        return raw;
    } catch {
        return fallback;
    }
};

export const LoadingView: FC<LoadingViewProps> = (props) => {
    const { isError = false, message = '', homeUrl = '', progress, currentTask = '' } = props;

    const customLogoUrl = useMemo(() => resolveConfigUrl('loading.logo.url'), []);
    const customBackground = useMemo(() => resolveConfigString('loading.background', ''), []);
    const progressBarColor = useMemo(() => resolveConfigString('loading.progress.color', 'linear-gradient(90deg,#4f8cff,#2563eb)'), []);

    const clampedProgress = typeof progress === 'number' && Number.isFinite(progress) ? Math.max(0, Math.min(100, Math.round(progress))) : null;

    const backgroundStyle = customBackground ? { background: customBackground } : undefined;

    const backgroundClassName = customBackground ? 'fixed inset-0 z-[2147483000]' : 'fixed inset-0 z-[2147483000] bg-[radial-gradient(#1d1a24,#003a6b)]';

    return (
        <Column fullHeight position="fixed" className={backgroundClassName} style={backgroundStyle}>
            <Base fullHeight className="container h-100">
                <Column fullHeight alignItems="center" justifyContent="center">
                    {isError && message && message.length ? (
                        <Column alignItems="center" className="absolute bottom-[20px] left-1/2 z-[3] -translate-x-1/2 max-w-[80%]" gap={2}>
                            <Text fontSizeCustom={20} variant="white" className="text-center [text-shadow:0px_4px_4px_rgba(0,0,0,0.25)]">
                                {message}
                            </Text>
                            {homeUrl && (
                                <a
                                    href={homeUrl}
                                    className="mt-3 px-6 py-3 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-base font-semibold no-underline cursor-pointer transition-colors duration-200 [text-shadow:none]"
                                >
                                    Back to Hotel
                                </a>
                            )}
                        </Column>
                    ) : (
                        <>
                            <Column alignItems="center" justifyContent="center" className="z-[3] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <img
                                    src={customLogoUrl || octaneLogo}
                                    alt="Octane"
                                    draggable={false}
                                    className="block w-auto h-auto max-w-[min(80vw,780px)] max-h-[32vh] select-none pointer-events-none drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
                                />
                                {message && message.length ? (
                                    <Text
                                        fontSizeCustom={22}
                                        variant="white"
                                        className="text-center mt-4 [text-shadow:0px_4px_4px_rgba(0,0,0,0.4)] tracking-wide"
                                    >
                                        {message}
                                    </Text>
                                ) : null}
                            </Column>
                            {clampedProgress !== null && (
                                <Column alignItems="center" gap={2} className="absolute bottom-[8vh] left-1/2 -translate-x-1/2 z-[4] w-[min(900px,90vw)]">
                                    <Base
                                        className="relative w-full h-8 rounded-full overflow-hidden border border-white/30 shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                                        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
                                    >
                                        <Base
                                            className="h-full rounded-full transition-[width] duration-300 ease-out"
                                            style={{ width: `${clampedProgress}%`, background: progressBarColor, boxShadow: '0 0 18px rgba(79,140,255,0.55)' }}
                                        />
                                        <Base
                                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                            style={{
                                                fontFamily: '"Poppins","Segoe UI",system-ui,sans-serif',
                                                fontWeight: 700,
                                                fontSize: '16px',
                                                color: '#fff',
                                                letterSpacing: '0.08em',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.6)'
                                            }}
                                        >
                                            {clampedProgress}%
                                        </Base>
                                    </Base>
                                    <Base
                                        className="text-center"
                                        style={{
                                            fontFamily: '"Poppins","Segoe UI",system-ui,sans-serif',
                                            fontWeight: 500,
                                            fontSize: '15px',
                                            color: 'rgba(255,255,255,0.85)',
                                            letterSpacing: '0.04em',
                                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                            minHeight: '22px'
                                        }}
                                    >
                                        {currentTask}
                                    </Base>
                                </Column>
                            )}
                        </>
                    )}
                </Column>
            </Base>
        </Column>
    );
};
