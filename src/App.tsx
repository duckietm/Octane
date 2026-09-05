import {
    GetAssetManager,
    GetAvatarRenderManager,
    GetCommunication,
    GetConfiguration,
    GetDesiredResolution,
    GetLocalizationManager,
    GetRoomEngine,
    GetRoomSessionManager,
    GetSessionDataManager,
    GetSoundManager,
    GetStage,
    GetTexturePool,
    GetTicker,
    HabboWebTools,
    LegacyExternalInterface,
    LoadGameUrlEvent,
    OctaneEventType,
    OctaneLogger,
    OctaneVersion,
    PrepareRenderer
} from '@octane/renderer';
import { FC, useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { ClearRememberLogin, exchangeSsoTicketForAccessToken, GetRememberLogin, GetUIVersion, persistAccessTokenFromPayload, SetRememberLogin, StoreRememberLoginFromPayload } from './api';
import { Base } from './common';
import { LoadingView } from './components/loading/LoadingView';
import { LoginView } from './components/login/LoginView';
import { MainView } from './components/MainView';
import { ReconnectView } from './components/reconnect/ReconnectView';
import { ClearStoredChatHistory, getConnectionFailureAction, useConnectionState, useDevicePixelRatio, useMessageEvent, useOctaneEvent } from './hooks';
import { SharedHookRegistry } from './state/useSharedHook';

OctaneVersion.UI_VERSION = GetUIVersion();

const getViewportDimensions = () => {
    const viewport = window.visualViewport;
    const width = Math.max(1, Math.floor(viewport?.width ?? window.innerWidth));
    const height = Math.max(1, Math.floor(viewport?.height ?? window.innerHeight));

    return { width, height };
};

const syncViewportCssVars = () => {
    const { width, height } = getViewportDimensions();

    document.documentElement.style.setProperty('--octane-app-width', `${width}px`);
    document.documentElement.style.setProperty('--octane-app-height', `${height}px`);
};

const preloadUrl = async (url: string): Promise<void> => {
    if (!url) return;

    // Split gamedata URLs are directories (end with '/'); fetching them as a
    // file just 404s and wastes a connection at startup. The real split loader
    // handles those — only warm up actual file URLs here.
    if (url.split('?')[0].split('#')[0].endsWith('/')) return;

    try {
        const response = await fetch(url, { cache: 'force-cache' });
        await response.arrayBuffer();
    } catch {}
};

const preloadImage = (url: string): void => {
    if (!url) return;

    try {
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
    } catch {}
};

const asStringArray = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.filter((item) => typeof item === 'string');
    if (typeof value === 'string' && value.length) return [value];

    return [];
};

const hasRememberLogin = (): boolean => !!GetRememberLogin();

export const App: FC<{}> = (props) => {
    const connectionState = useConnectionState();
    const devicePixelRatio = useDevicePixelRatio();
    const [isReady, setIsReady] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [homeUrl, setHomeUrl] = useState('');
    const [showLogin, setShowLogin] = useState(false);
    const [isEnteringHotel, setIsEnteringHotel] = useState(() => !!window.OctaneConfig?.['sso.ticket'] || hasRememberLogin());
    const [prepareTrigger, setPrepareTrigger] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingTask, setLoadingTask] = useState('');
    const taskLabel = useCallback((key: string, fallback: string): string => {
        try {
            const locManager = GetLocalizationManager();
            if (locManager && typeof locManager.getValue === 'function') {
                const fromLoc = locManager.getValue(key, false);

                if (typeof fromLoc === 'string' && fromLoc.length && fromLoc !== key) return fromLoc;
            }
        } catch {}

        try {
            const fromConfig = GetConfiguration().getValue<string>(key, '');
            if (typeof fromConfig === 'string' && fromConfig.length) return fromConfig;
        } catch {}

        return fallback;
    }, []);
    const bumpProgress = useCallback((value: number, task?: string) => {
        setLoadingProgress((prev) => (value > prev ? value : prev));
        if (task !== undefined) setLoadingTask(task);
    }, []);
    const warmupPromiseRef = useRef<Promise<void>>(null);
    const rendererPromiseRef = useRef<Promise<any>>(null);
    const gameInitPromiseRef = useRef<Promise<void> | null>(null);
    const bootstrapDoneRef = useRef(false);
    const lastPrepareTriggerRef = useRef<number | null>(null);
    const tickersStartedRef = useRef(false);
    const heartbeatIntervalRef = useRef<number>(null);
    const rememberRotateIntervalRef = useRef<number>(null);
    const previousConnectionPhaseRef = useRef(connectionState.phase);

    const clearStoredCredentials = useCallback(() => {
        ClearStoredChatHistory();
        ClearRememberLogin();
        try {
            delete (window as any).OctaneConfig?.['sso.ticket'];
        } catch {}
        try {
            GetConfiguration().setValue('sso.ticket', '');
        } catch {}
        try {
            const url = new URL(window.location.href);

            if (url.searchParams.has('sso')) {
                url.searchParams.delete('sso');
                window.history.replaceState({}, '', url.toString());
            }
        } catch {}
    }, []);

    const showSessionExpired = useCallback(() => {
        console.warn('[App] showSessionExpired — diagnostic shown (mid-game close)');
        clearStoredCredentials();

        const baseUrl = window.location.origin + '/';
        setHomeUrl(baseUrl);
        setErrorMessage('Your session has expired.\nPlease log in again to enter the hotel.');
        setIsReady(false);
        setShowLogin(false);
        setIsEnteringHotel(false);
    }, [clearStoredCredentials]);

    const fallbackToLogin = useCallback(() => {
        const rawLoginEnabled = GetConfiguration().getValue<unknown>('login.screen.enabled', false);
        const loginScreenEnabled = rawLoginEnabled === true || rawLoginEnabled === 'true' || rawLoginEnabled === 1;

        if (!loginScreenEnabled) {
            console.warn('[App] fallbackToLogin — login.screen.enabled=false, redirecting to home instead');
            showSessionExpired();
            return;
        }
        console.warn('[App] fallbackToLogin — surfacing login form, credentials cleared');
        clearStoredCredentials();
        setHomeUrl('');
        setErrorMessage('');
        setIsReady(false);
        setShowLogin(true);
        setIsEnteringHotel(false);
    }, [clearStoredCredentials, showSessionExpired]);

    const applySsoTicket = useCallback((ssoTicket: string) => {
        if (!ssoTicket) return;
        ClearStoredChatHistory();
        window.OctaneConfig['sso.ticket'] = ssoTicket;
        GetConfiguration().setValue('sso.ticket', ssoTicket);
        void exchangeSsoTicketForAccessToken(ssoTicket);
    }, []);

    useEffect(() => {
        const ssoTicket = window.OctaneConfig?.['sso.ticket'];

        if (typeof ssoTicket === 'string' && ssoTicket.length) void exchangeSsoTicketForAccessToken(ssoTicket);
    }, []);

    const handleAuthenticated = useCallback(
        (ssoTicket: string) => {
            if (!ssoTicket) return;
            applySsoTicket(ssoTicket);
            setIsEnteringHotel(true);
            setErrorMessage('');
            setPrepareTrigger((prev) => prev + 1);
        },
        [applySsoTicket]
    );

    const tryRememberLogin = useCallback(async (): Promise<string> => {
        const remembered = GetRememberLogin();

        console.warn('[App] tryRememberLogin start', {
            hasRemembered: !!remembered,
            hasToken: !!remembered?.token?.length,
            hasStoredSso: !!remembered?.ssoTicket?.length
        });

        if (!remembered?.token?.length) {
            if (remembered) ClearRememberLogin();
            console.warn('[App] tryRememberLogin → no token, returning empty');
            return '';
        }

        try {
            const rawEndpoint = GetConfiguration().getValue<string>('login.remember.endpoint', '${api.url}/api/auth/remember');
            const endpoint = GetConfiguration().interpolate(rawEndpoint);
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'OctaneRememberLogin'
                },
                body: JSON.stringify({ rememberToken: remembered.token })
            });

            let payload: Record<string, unknown> = {};
            try {
                payload = await response.json();
            } catch {}

            const ssoTicket = typeof payload.ssoTicket === 'string' ? payload.ssoTicket : typeof payload.sso === 'string' ? payload.sso : '';

            console.warn('[App] tryRememberLogin → remember endpoint replied', {
                status: response.status,
                ok: response.ok,
                gotSsoTicket: !!ssoTicket
            });

            if (response.ok && ssoTicket) {
                persistAccessTokenFromPayload(payload);
                StoreRememberLoginFromPayload(payload, typeof payload.username === 'string' ? payload.username : remembered.username, ssoTicket);
                return ssoTicket;
            }
        } catch (error) {
            console.warn('[App] tryRememberLogin → fetch threw', error);
        }

        ClearRememberLogin();
        console.warn('[App] tryRememberLogin → cleared remember, returning empty');

        return '';
    }, []);

    const rotateRememberLogin = useCallback(async (): Promise<void> => {
        const remembered = GetRememberLogin();

        if (!remembered?.token?.length) return;

        try {
            const rawEndpoint = GetConfiguration().getValue<string>('login.refresh.endpoint', '${api.url}/api/auth/refresh');
            const endpoint = GetConfiguration().interpolate(rawEndpoint);
            const response = await fetch(endpoint, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'OctaneRememberRotate'
                },
                body: JSON.stringify({ rememberToken: remembered.token })
            });

            let payload: Record<string, unknown> = {};
            try {
                payload = await response.json();
            } catch {}

            if (response.ok) {
                persistAccessTokenFromPayload(payload);
                StoreRememberLoginFromPayload(payload, remembered.username, remembered.ssoTicket);
                return;
            }

            if (response.status === 400 || response.status === 401 || response.status === 403) ClearRememberLogin();
        } catch (error) {
            OctaneLogger.error('[LoginScreen] Remember rotation failed', error);
        }
    }, []);

    useEffect(() => {
        const previousPhase = previousConnectionPhaseRef.current;
        const currentPhase = connectionState.phase;
        previousConnectionPhaseRef.current = currentPhase;

        const action = getConnectionFailureAction(previousPhase, currentPhase, isReady);

        if (action === 'login') {
            console.warn('[App] Connection failed before authentication completed — falling back to login');
            fallbackToLogin();
        } else if (action === 'expired') {
            showSessionExpired();
        }
    }, [connectionState.phase, fallbackToLogin, isReady, showSessionExpired]);

    useMessageEvent<LoadGameUrlEvent>(LoadGameUrlEvent, (event) => {
        const parser = event.getParser();

        if (!parser) return;

        LegacyExternalInterface.callGame('showGame', parser.url);
    });

    const startRenderer = useCallback((width: number, height: number) => {
        if (rendererPromiseRef.current) return rendererPromiseRef.current;

        const rawUseBackBuffer = window.OctaneConfig?.['renderer.useBackBuffer'];
        const useBackBuffer = rawUseBackBuffer === undefined ? true : rawUseBackBuffer === true || rawUseBackBuffer === 'true';

        rendererPromiseRef.current = PrepareRenderer({
            width: Math.floor(width),
            height: Math.floor(height),
            resolution: GetDesiredResolution(),
            autoDensity: true,
            backgroundAlpha: 0,
            preference: 'webgl',
            eventMode: 'none',
            failIfMajorPerformanceCaveat: false,
            roundPixels: true,
            useBackBuffer
        });

        return rendererPromiseRef.current;
    }, []);

    const startWarmup = useCallback(
        (width: number, height: number) => {
            if (warmupPromiseRef.current) return warmupPromiseRef.current;

            warmupPromiseRef.current = (async () => {
                await GetConfiguration().init();
                bumpProgress(25, taskLabel('loader.waiting', 'Loading content...'));

                GetTicker().maxFPS = GetConfiguration().getValue<number>('system.fps.max', 24);
                OctaneLogger.LOG_DEBUG = GetConfiguration().getValue<boolean>('system.log.debug', true);
                OctaneLogger.LOG_WARN = GetConfiguration().getValue<boolean>('system.log.warn', false);
                OctaneLogger.LOG_ERROR = GetConfiguration().getValue<boolean>('system.log.error', false);
                OctaneLogger.LOG_EVENTS = GetConfiguration().getValue<boolean>('system.log.events', false);
                OctaneLogger.LOG_PACKETS = GetConfiguration().getValue<boolean>('system.log.packets', false);

                startRenderer(width, height).catch((error) => OctaneLogger.error('[LoginScreen] Renderer warmup failed', error));

                const interpolate = (value: string) => GetConfiguration().interpolate(value);
                const assetUrls = asStringArray(GetConfiguration().getValue<unknown>('preload.assets.urls')).map(interpolate);
                const gamedataUrls = [
                    ...asStringArray(GetConfiguration().getValue<unknown>('external.texts.url')).map(interpolate),
                    ...['furnidata.url', 'productdata.url', 'avatar.actions.url', 'avatar.figuredata.url', 'avatar.figuremap.url', 'avatar.effectmap.url']
                        .map((key) => interpolate(GetConfiguration().getValue<string>(key, '')))
                        .filter(Boolean)
                ];
                const loginImages = (GetConfiguration().getValue<Record<string, unknown>>('loginview', {})?.images as Record<string, string>) ?? {};
                const loginImageUrls = [
                    loginImages.background,
                    loginImages.sun,
                    loginImages.drape,
                    loginImages.left,
                    loginImages['right.repeat'],
                    loginImages.right
                ]
                    .filter(Boolean)
                    .map(interpolate);

                loginImageUrls.forEach(preloadImage);
                gamedataUrls.forEach((url) => preloadUrl(url));

                const warmupTasks: { promise: Promise<any>; label: string }[] = [
                    { promise: GetAssetManager().downloadAssets(assetUrls), label: taskLabel('loading.task.assets', 'Loading game assets...') },
                    { promise: GetLocalizationManager().init(), label: taskLabel('loading.task.localization', 'Loading translations...') },
                    { promise: GetAvatarRenderManager().init(), label: taskLabel('loading.task.avatar', 'Loading wardrobe...') },
                    { promise: GetSoundManager().init(), label: taskLabel('loading.task.sounds', 'Loading sounds...') }
                ];
                let warmupDone = 0;
                const warmupStart = 25;
                const warmupSpan = 45;
                await Promise.all(
                    warmupTasks.map((t) =>
                        t.promise.then((value) => {
                            warmupDone++;
                            bumpProgress(warmupStart + Math.round((warmupSpan * warmupDone) / warmupTasks.length), t.label);
                            return value;
                        })
                    )
                );
            })();

            return warmupPromiseRef.current;
        },
        [startRenderer, bumpProgress, taskLabel]
    );

    useEffect(() => {
        syncViewportCssVars();

        const handleViewportResize = () => syncViewportCssVars();
        const viewport = window.visualViewport;

        window.addEventListener('resize', handleViewportResize);
        viewport?.addEventListener('resize', handleViewportResize);
        viewport?.addEventListener('scroll', handleViewportResize);

        return () => {
            window.removeEventListener('resize', handleViewportResize);
            viewport?.removeEventListener('resize', handleViewportResize);
            viewport?.removeEventListener('scroll', handleViewportResize);
        };
    }, []);

    const onSessionExpired = useEffectEvent(() => showSessionExpired());
    const onInitFailure = useEffectEvent(() => fallbackToLogin());

    useEffect(() => {
        const prepare = async (width: number, height: number) => {
            console.warn('[App] prepare() start', {
                hasOctaneConfig: !!window.OctaneConfig,
                ssoTicketInConfig: !!window.OctaneConfig?.['sso.ticket'],
                hasRememberLocal: !!GetRememberLogin(),
                hasUrlSso: !!new URLSearchParams(window.location.search).get('sso')
            });

            const bootLabel = taskLabel('loader', 'Booting...');
            setLoadingProgress(0);
            setLoadingTask(bootLabel);
            bumpProgress(5, bootLabel);

            try {
                if (!window.OctaneConfig) throw new Error('OctaneConfig is not defined!');

                let ssoTicket = window.OctaneConfig['sso.ticket'];
                if (ssoTicket) GetConfiguration().setValue('sso.ticket', ssoTicket);

                try {
                    const urlParams = new URLSearchParams(window.location.search);
                    const tokenParam = urlParams.get('token');
                    const tokenExpParam = urlParams.get('token_exp');
                    if (tokenParam && !GetRememberLogin()) {
                        const parsedExpiry = Number(tokenExpParam || 0);
                        const expiresAt = Number.isFinite(parsedExpiry) && parsedExpiry > 0 ? parsedExpiry : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
                        SetRememberLogin({ token: tokenParam, expiresAt });
                    }
                } catch (e) {
                    console.warn('[App] failed to persist remember token from URL', e);
                }

                bumpProgress(10, taskLabel('loading.task.session', 'Verifying session...'));

                if (!ssoTicket || ssoTicket === '') {
                    let configInitError: unknown = null;
                    try {
                        await GetConfiguration().init();
                    } catch (e) {
                        configInitError = e;
                    }

                    const rawLoginEnabled = GetConfiguration().getValue<unknown>('login.screen.enabled', false);
                    const loginScreenEnabled = rawLoginEnabled === true || rawLoginEnabled === 'true' || rawLoginEnabled === 1;

                    console.warn('[App] no SSO path — login gate', {
                        configInitError: configInitError ? String((configInitError as Error)?.message ?? configInitError) : null,
                        rawLoginEnabled,
                        rawLoginEnabledType: typeof rawLoginEnabled,
                        loginScreenEnabled
                    });

                    if (configInitError) {
                        OctaneLogger.error('[LoginScreen] Failed to load renderer-config.json — cannot resolve login.screen.enabled', configInitError);
                    }

                    if (loginScreenEnabled) {
                        const rememberedSsoTicket = await tryRememberLogin();

                        if (rememberedSsoTicket) {
                            ssoTicket = rememberedSsoTicket;
                            applySsoTicket(rememberedSsoTicket);
                            setShowLogin(false);
                        } else {
                            setIsReady(false);
                            setShowLogin(true);
                            startWarmup(width, height).catch((error) => OctaneLogger.error('[LoginScreen] Warmup failed', error));
                            return;
                        }
                    } else {
                        if (configInitError) {
                            setHomeUrl(window.location.origin + '/');
                            setErrorMessage(`Unable to load renderer-config.json.\n${String((configInitError as Error)?.message ?? configInitError)}`);
                            setIsReady(false);
                            setShowLogin(false);
                            setIsEnteringHotel(false);
                            return;
                        }

                        onSessionExpired();
                        return;
                    }
                }

                const renderer = await startRenderer(width, height);
                bumpProgress(20, taskLabel('loading.task.renderer', 'Initializing renderer...'));

                await startWarmup(width, height);
                bumpProgress(70, taskLabel('loading.task.startsession', 'Starting session...'));

                if (!gameInitPromiseRef.current) {
                    gameInitPromiseRef.current = (async () => {
                        await GetSessionDataManager().init();
                        bumpProgress(78, taskLabel('loading.task.userdata', 'Loading user data...'));
                        await GetRoomSessionManager().init();
                        bumpProgress(85, taskLabel('loading.task.rooms', 'Loading rooms...'));
                        await GetRoomEngine().init();
                        bumpProgress(92, taskLabel('loading.task.engine', 'Loading graphics engine...'));
                        await GetCommunication().init();
                        bumpProgress(98, taskLabel('generic.reconnecting', 'Connecting to server...'));
                    })();
                }

                await gameInitPromiseRef.current;

                if (!bootstrapDoneRef.current) {
                    bootstrapDoneRef.current = true;
                    if (LegacyExternalInterface.available) LegacyExternalInterface.call('legacyTrack', 'authentication', 'authok', []);
                    HabboWebTools.sendHeartBeat();
                }

                if (heartbeatIntervalRef.current !== null) window.clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = window.setInterval(() => HabboWebTools.sendHeartBeat(), 10000);

                if (rememberRotateIntervalRef.current !== null) window.clearInterval(rememberRotateIntervalRef.current);

                const rotateMinutes = Math.max(1, Number(GetConfiguration().getValue<unknown>('login.remember.rotate.interval.minutes', 15)) || 15);
                if (GetRememberLogin()?.token?.length)
                    rememberRotateIntervalRef.current = window.setInterval(() => rotateRememberLogin(), rotateMinutes * 60 * 1000);

                if (!tickersStartedRef.current) {
                    tickersStartedRef.current = true;
                    GetTicker().add((ticker) => GetRoomEngine().update(ticker));
                    GetTicker().add((ticker) => renderer.render(GetStage()));
                    GetTicker().add((ticker) => GetTexturePool().run());
                }

                bumpProgress(100, taskLabel('onboarding.button.ready', 'Ready!'));
                setIsReady(true);
                setShowLogin(false);
                setIsEnteringHotel(false);
            } catch (err) {
                OctaneLogger.error('[App] Initialization failed — falling back to login', err);
                onInitFailure();
            }
        };

        if (lastPrepareTriggerRef.current === prepareTrigger) return;
        lastPrepareTriggerRef.current = prepareTrigger;

        const { width, height } = getViewportDimensions();

        prepare(width, height);

        return () => {
            if (heartbeatIntervalRef.current !== null) window.clearInterval(heartbeatIntervalRef.current);
            if (rememberRotateIntervalRef.current !== null) window.clearInterval(rememberRotateIntervalRef.current);
        };
    }, [prepareTrigger, startWarmup, startRenderer, tryRememberLogin, applySsoTicket, rotateRememberLogin, bumpProgress, taskLabel]);

    return (
        <Base fit overflow="hidden" className={`octane-app-root ${!(devicePixelRatio % 1) ? 'image-rendering-pixelated' : ''}`}>
            {!isReady && !showLogin && (
                <LoadingView isError={errorMessage.length > 0} message={errorMessage} homeUrl={homeUrl} progress={loadingProgress} currentTask={loadingTask} />
            )}
            {!isReady && showLogin && <LoginView onAuthenticated={handleAuthenticated} isEntering={isEnteringHotel} />}
            {isReady && (
                <SharedHookRegistry fallback={<LoadingView message="Loading…" />}>
                    <MainView />
                    <ReconnectView />
                </SharedHookRegistry>
            )}
            <Base id="draggable-windows-container" />
        </Base>
    );
};
