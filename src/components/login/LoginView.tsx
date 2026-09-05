import { GetAvatarRenderManager, GetConfiguration } from '@octane/renderer';
import { FC, useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { FaDice } from 'react-icons/fa';
import { ClearRememberLogin, GetConfigurationValue, GetRememberLogin, persistAccessTokenFromPayload, StoreRememberLoginFromPayload } from '../../api';
import flagEn from '../../assets/images/flag_icon/flag_icon_en.png';
import flagEs from '../../assets/images/flag_icon/flag_icon_es.png';
import flagFr from '../../assets/images/flag_icon/flag_icon_fr.png';
import flagIt from '../../assets/images/flag_icon/flag_icon_it.png';
import flagNl from '../../assets/images/flag_icon/flag_icon_nl.png';
import { applyTextTranslationLocale } from '../../hooks/translation/useTranslation';
import { configFileUrl } from '../../secure-assets';
import { LoginModal } from './components/LoginModal';
import { NewsWindow } from './components/NewsWindow';
import { RegistrationAvatarWardrobe } from './components/RegistrationAvatarWardrobe';
import { TurnstileWidget } from './TurnstileWidget';
import { t } from './utils/i18n';
import { clearRegistrationDraft, loadRegistrationDraft, saveRegistrationDraft } from './utils/registrationDraft';

type DialogMode = 'login' | 'register' | 'forgot';
type LoginLocale = { code: string; file: string; label: string; flag: string };

const interpolate = (value: string | null | undefined): string => {
    if (!value) return '';

    let output = value;

    try {
        output = GetConfiguration().interpolate(value) || value;
    } catch {}

    return output.replace(/\$\{([^}]+)\}/g, (_, key: string) => {
        if (key === 'api.url' && typeof (window as any).OctaneSecureApiUrl === 'string') {
            const secureApiUrl = (window as any).OctaneSecureApiUrl.replace(/\/$/, '');

            if (secureApiUrl) return secureApiUrl;
        }

        try {
            const configValue = GetConfiguration().getValue<string>(key, '');

            if (configValue) return configValue;
        } catch {}

        try {
            const configValue = GetConfigurationValue<string>(key, '');

            if (configValue) return configValue;
        } catch {}

        return '';
    });
};

const LOCK_KEY = 'nitro.login.lock';
const CHAT_TRANSLATION_SETTINGS_KEY = 'chatTranslationSettings';
const MAX_ATTEMPTS = 5;
const LOCK_WINDOW_MS = 60_000;
const LOCK_DURATION_MS = 2 * 60_000;
const getDefaultLoginImages = (): Record<string, string> => {
    const imagesBase = (GetConfigurationValue<string>('images.url', '') || '').replace(/\/$/, '');

    if (!imagesBase.length) return { 'background.colour': '#6eadc8' };

    return {
        background: `${imagesBase}/reception/background_gradient_apr25.png`,
        'background.colour': '#6eadc8',
        drape: `${imagesBase}/reception/drape.png`,
        left: `${imagesBase}/reception/mute_reception_backdrop_left.png`,
        right: `${imagesBase}/reception/background_right.png`
    };
};
const LOGIN_LOCALES: LoginLocale[] = [
    { code: 'it', file: 'it', label: 'Italiano', flag: flagIt },
    { code: 'en', file: 'com', label: 'English', flag: flagEn },
    { code: 'es', file: 'es', label: 'Español', flag: flagEs },
    { code: 'fr', file: 'fr', label: 'Français', flag: flagFr },
    { code: 'nl', file: 'nl', label: 'Nederlands', flag: flagNl }
];

type AttemptState = { attempts: number; firstAt: number; lockedUntil: number };

const readLock = (): AttemptState => {
    try {
        const raw = sessionStorage.getItem(LOCK_KEY);
        if (!raw) return { attempts: 0, firstAt: 0, lockedUntil: 0 };
        return JSON.parse(raw);
    } catch {
        return { attempts: 0, firstAt: 0, lockedUntil: 0 };
    }
};

const writeLock = (state: AttemptState) => {
    try {
        sessionStorage.setItem(LOCK_KEY, JSON.stringify(state));
    } catch {}
};

const normalizeLanguageCode = (value: string): string => {
    if (!value) return '';

    const normalized = value.trim().replace('_', '-');
    const parts = normalized.split('-');

    if (parts.length === 1) return parts[0].toLowerCase();

    return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
};

const resolveLoginLocale = (value: string): LoginLocale => {
    const normalized = normalizeLanguageCode(value);
    const exactMatch = LOGIN_LOCALES.find((locale) => normalizeLanguageCode(locale.code) === normalized);

    if (exactMatch) return exactMatch;

    const base = normalized.split('-')[0];

    if (base === 'pt') return LOGIN_LOCALES.find((locale) => locale.file === 'br') || LOGIN_LOCALES[0];

    return LOGIN_LOCALES.find((locale) => normalizeLanguageCode(locale.code).split('-')[0] === base) || LOGIN_LOCALES[0];
};

const getBrowserLocale = (): LoginLocale => {
    if (typeof navigator === 'undefined') return LOGIN_LOCALES[0];

    return resolveLoginLocale(navigator.language || navigator.languages?.[0] || 'it');
};

const readCachedLocale = (): LoginLocale => {
    try {
        const settings = JSON.parse(localStorage.getItem(CHAT_TRANSLATION_SETTINGS_KEY) || '{}');

        if (typeof settings.uiTextLanguage === 'string' && settings.uiTextLanguage.length) return resolveLoginLocale(settings.uiTextLanguage);
    } catch {}

    return getBrowserLocale();
};

const applyLocaleSelection = (locale: LoginLocale): void => {
    try {
        const previousSettings = JSON.parse(localStorage.getItem(CHAT_TRANSLATION_SETTINGS_KEY) || '{}');
        const nextSettings = {
            enabled: previousSettings.enabled ?? false,
            incomingTargetLanguage: previousSettings.incomingTargetLanguage || locale.code,
            outgoingTargetLanguage: previousSettings.outgoingTargetLanguage || locale.code,
            ...previousSettings,
            uiTextLanguage: locale.code
        };

        localStorage.setItem(CHAT_TRANSLATION_SETTINGS_KEY, JSON.stringify(nextSettings));
    } catch {}
};

const LoginSubmitButton: FC<{ isEntering: boolean; isLocked: boolean; loginPingingServer: boolean }> = ({ isEntering, isLocked, loginPingingServer }) => {
    const { pending } = useFormStatus();

    return (
        <button type="submit" className="ok-button" disabled={pending || isEntering || isLocked}>
            {isEntering
                ? t('nitro.login.entering', 'Entering…')
                : pending || loginPingingServer
                  ? t('nitro.login.server.checking', 'Checking…')
                  : t('login.title', 'Log in')}
        </button>
    );
};

export interface LoginViewProps {
    onAuthenticated: (ssoTicket: string) => void;
    isEntering?: boolean;
}

export const LoginView: FC<LoginViewProps> = ({ onAuthenticated, isEntering = false }) => {
    const [mode, setMode] = useState<DialogMode>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [loginTurnstileToken, setLoginTurnstileToken] = useState('');
    const [loginTurnstileResetSignal, setLoginTurnstileResetSignal] = useState(0);
    const [loginServerReachable, setLoginServerReachable] = useState<boolean | null>(null);
    const [loginPingingServer, setLoginPingingServer] = useState(false);
    const [rememberMe, setRememberMe] = useState(() => !!GetRememberLogin());
    const [selectedLocale, setSelectedLocale] = useState<LoginLocale>(() => readCachedLocale());
    const [localeApplying, setLocaleApplying] = useState(false);
    const [localeError, setLocaleError] = useState('');
    const initialLocaleRef = useRef(selectedLocale);
    const [loginViewConfig, setLoginViewConfig] = useState<Record<string, unknown>>(() => GetConfigurationValue<Record<string, unknown>>('loginview', {}));
    const submitTimeRef = useRef(0);
    const preloadedLoginImagesRef = useRef<Set<string>>(new Set());

    const configuredLoginImages = useMemo<Record<string, string>>(() => (loginViewConfig?.['images'] as Record<string, string>) ?? {}, [loginViewConfig]);
    const loginImages = useMemo<Record<string, string>>(() => ({ ...getDefaultLoginImages(), ...configuredLoginImages }), [configuredLoginImages]);

    const configuredLoginWidgets = useMemo<Record<string, unknown>>(() => (loginViewConfig?.['widgets'] as Record<string, unknown>) ?? {}, [loginViewConfig]);

    const loginWidgetSlots = useMemo(() => {
        return Object.entries(configuredLoginWidgets)
            .filter(([key, value]) => key.startsWith('slot.') && key.endsWith('.widget') && typeof value === 'string' && value.length > 0)
            .map(([key, value]) => {
                const slotNum = key.match(/\d+/)?.[0] ?? '';
                const conf = (configuredLoginWidgets[`slot.${slotNum}.conf`] as Record<string, unknown>) ?? {};

                return { key, slotNum: Number(slotNum), type: value as string, conf };
            })
            .filter((slot) => slot.slotNum > 0)
            .sort((a, b) => a.slotNum - b.slotNum);
    }, [configuredLoginWidgets]);

    const backgroundColor = loginImages['background.colour'] || GetConfigurationValue<string>('login_background.colour', '#6eadc8');
    const background = interpolate(loginImages['background'] || GetConfigurationValue<string>('login_background', ''));
    const sun = interpolate(loginImages['sun'] || GetConfigurationValue<string>('login_sun', ''));
    const drape = interpolate(loginImages['drape'] || GetConfigurationValue<string>('login_drape', ''));
    const left = interpolate(loginImages['left'] || GetConfigurationValue<string>('login_left', ''));
    const rightRepeat = interpolate(loginImages['right.repeat'] || GetConfigurationValue<string>('login_right.repeat', ''));
    const right = interpolate(loginImages['right'] || GetConfigurationValue<string>('login_right', ''));
    const widgetImageUrls = useMemo(
        () => loginWidgetSlots.map((slot) => (typeof slot.conf.image === 'string' ? interpolate(slot.conf.image) : '')).filter(Boolean),
        [loginWidgetSlots]
    );
    const loginImageUrls = useMemo(
        () => [background, sun, drape, left, rightRepeat, right, ...widgetImageUrls].filter(Boolean),
        [background, sun, drape, left, rightRepeat, right, widgetImageUrls]
    );
    const [loginImagesVersion, setLoginImagesVersion] = useState(0);
    const loginUrl = GetConfigurationValue<string>('login.endpoint', '/api/auth/login');
    const registerUrl = GetConfigurationValue<string>('login.register.endpoint', '/api/auth/register');
    const roomTemplatesUrl = GetConfigurationValue<string>('login.room_templates.endpoint', '/api/auth/room-templates');
    const forgotUrl = GetConfigurationValue<string>('login.forgot.endpoint', '/api/auth/forgot-password');
    const newsUrl = interpolate(GetConfigurationValue<string>('login.news.url', ''));
    const turnstileSiteKey = GetConfigurationValue<string>('login.turnstile.sitekey', '');
    const rawTurnstileEnabled = GetConfigurationValue<unknown>('login.turnstile.enabled', false);
    const turnstileEnabled =
        (rawTurnstileEnabled === true || rawTurnstileEnabled === 'true' || rawTurnstileEnabled === 1 || rawTurnstileEnabled === '1') && !!turnstileSiteKey;

    const resetLoginTurnstile = useCallback(() => {
        setLoginTurnstileToken('');
        setLoginTurnstileResetSignal((prev) => prev + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const locale = initialLocaleRef.current;

        setLocaleApplying(true);

        void applyTextTranslationLocale(locale.code)
            .catch(() => {
                if (!cancelled) setLocaleError('Unable to load this language pack.');
            })
            .finally(() => {
                if (!cancelled) setLocaleApplying(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const closeDialog = useCallback(() => setMode('login'), []);

    useEffect(() => {
        setError(null);
        if (mode === 'login') resetLoginTurnstile();
    }, [mode, resetLoginTurnstile]);

    useEffect(() => {
        let cancelled = false;

        const refreshLoginViewConfig = () => {
            if (cancelled) return;

            const nextConfig = GetConfigurationValue<Record<string, unknown>>('loginview', {});

            setLoginViewConfig((previousConfig) => {
                try {
                    return JSON.stringify(previousConfig) === JSON.stringify(nextConfig) ? previousConfig : nextConfig;
                } catch {
                    return nextConfig;
                }
            });
        };

        refreshLoginViewConfig();

        const timers = [50, 150, 300, 600, 1000, 2000].map((delay) => window.setTimeout(refreshLoginViewConfig, delay));

        return () => {
            cancelled = true;
            timers.forEach((timer) => window.clearTimeout(timer));
        };
    }, []);

    const changeLocaleSelection = useCallback(
        async (localeCode: string) => {
            const locale = LOGIN_LOCALES.find((candidate) => candidate.code === localeCode);

            if (!locale || localeApplying) return;

            const previousLocale = selectedLocale;

            setSelectedLocale(locale);
            setLocaleApplying(true);
            setLocaleError('');

            try {
                await applyTextTranslationLocale(locale.code);
                applyLocaleSelection(locale);
            } catch {
                setSelectedLocale(previousLocale);
                setLocaleError('Unable to load this language pack.');
            } finally {
                setLocaleApplying(false);
            }
        },
        [localeApplying, selectedLocale]
    );

    useEffect(() => {
        if (!loginImageUrls.length) return;

        let cancelled = false;
        let remaining = 0;

        loginImageUrls
            .filter((url) => {
                if (preloadedLoginImagesRef.current.has(url)) return false;

                preloadedLoginImagesRef.current.add(url);

                return true;
            })
            .forEach((url) => {
                remaining++;

                const image = new Image();

                image.onload = image.onerror = () => {
                    remaining--;

                    if (!cancelled && remaining <= 0) setLoginImagesVersion((version) => version + 1);
                };

                image.src = url;
            });

        return () => {
            cancelled = true;
        };
    }, [loginImageUrls]);

    useEffect(() => {
        if (!info) return;
        const timeout = window.setTimeout(() => setInfo(null), 8000);
        return () => window.clearTimeout(timeout);
    }, [info]);

    const lockState = readLock();
    const now = Date.now();
    const isLocked = lockState.lockedUntil > now;

    const recordFailure = useCallback(() => {
        const state = readLock();
        const currentNow = Date.now();

        if (currentNow - state.firstAt > LOCK_WINDOW_MS) {
            writeLock({ attempts: 1, firstAt: currentNow, lockedUntil: 0 });
            return;
        }

        const attempts = state.attempts + 1;
        const lockedUntil = attempts >= MAX_ATTEMPTS ? currentNow + LOCK_DURATION_MS : 0;
        writeLock({ attempts, firstAt: state.firstAt || currentNow, lockedUntil });
    }, []);

    const clearLock = useCallback(() => {
        writeLock({ attempts: 0, firstAt: 0, lockedUntil: 0 });
    }, []);

    const postJson = useCallback(async (url: string, body: Record<string, unknown>) => {
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Requested-With': 'OctaneLoginView'
            },
            body: JSON.stringify(body)
        });

        let payload: Record<string, unknown> = {};
        try {
            payload = await response.json();
        } catch {}

        return { ok: response.ok, status: response.status, payload };
    }, []);

    const healthUrl = GetConfigurationValue<string>('login.health.endpoint', '');
    const healthMethodRaw = GetConfigurationValue<string>('login.health.method', 'GET');
    const healthMethod = (healthMethodRaw || 'GET').toUpperCase();
    const checkServerReachable = useCallback(async (): Promise<boolean> => {
        if (!healthUrl) return true;
        try {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 5000);
            try {
                const response = await fetch(healthUrl, { method: healthMethod, credentials: 'omit', signal: controller.signal });
                if (response.status === 403) return false;
                if (response.status >= 500) return false;
                return true;
            } finally {
                window.clearTimeout(timer);
            }
        } catch {
            return false;
        }
    }, [healthUrl, healthMethod]);

    const pingLoginServer = useCallback(async () => {
        setLoginPingingServer(true);
        try {
            const ok = await checkServerReachable();
            setLoginServerReachable(ok);
            return ok;
        } finally {
            setLoginPingingServer(false);
        }
    }, [checkServerReachable]);

    const loginAction = useCallback(
        async (_prev: null, formData: FormData): Promise<null> => {
            if (isEntering) return null;

            const nowTs = Date.now();
            if (nowTs - submitTimeRef.current < 1000) return null;
            submitTimeRef.current = nowTs;

            const usernameInput = String(formData.get('username') || '').trim();
            const passwordInput = String(formData.get('password') || '');
            const rememberFlag = formData.get('remember') === 'on';

            const lockSnapshot = readLock();
            if (lockSnapshot.lockedUntil > nowTs) {
                const remaining = Math.ceil((lockSnapshot.lockedUntil - nowTs) / 1000);
                setError(t('nitro.login.error.too_many_attempts', 'Too many attempts. Try again in %seconds%s.', ['seconds'], [String(remaining)]));
                return null;
            }

            if (!usernameInput || !passwordInput) {
                setError(t('nitro.login.error.missing_credentials', 'Please enter both your Habbo name and password.'));
                return null;
            }

            if (turnstileEnabled && !loginTurnstileToken) {
                setError(t('nitro.login.error.turnstile', 'Please complete the security check.'));
                return null;
            }

            setError(null);

            try {
                const { ok, payload } = await postJson(loginUrl, {
                    username: usernameInput,
                    password: passwordInput,
                    remember: rememberFlag,
                    turnstileToken: turnstileEnabled ? loginTurnstileToken : undefined
                });

                const ssoTicket = typeof payload.ssoTicket === 'string' ? payload.ssoTicket : typeof payload.sso === 'string' ? payload.sso : '';

                if (ok && ssoTicket) {
                    clearLock();
                    persistAccessTokenFromPayload(payload);
                    if (rememberFlag)
                        StoreRememberLoginFromPayload(payload, typeof payload.username === 'string' ? payload.username : usernameInput, ssoTicket);
                    else ClearRememberLogin();
                    onAuthenticated(ssoTicket);
                    return null;
                }

                recordFailure();
                const message =
                    typeof payload.error === 'string' ? payload.error : t('nitro.login.error.invalid_credentials', 'Invalid Habbo name or password.');
                setError(message);
                resetLoginTurnstile();
            } catch {
                recordFailure();
                setError(t('nitro.login.error.login_unreachable', 'Unable to reach the login service. Please try again.'));
                resetLoginTurnstile();
            }

            return null;
        },
        [isEntering, turnstileEnabled, loginTurnstileToken, loginUrl, postJson, clearLock, recordFailure, onAuthenticated, resetLoginTurnstile]
    );

    const [, submitLoginAction, isLoginPending] = useActionState<null, FormData>(loginAction, null);

    const checkEmailUrl = GetConfigurationValue<string>('login.check-email.endpoint', '/api/auth/check-email');
    const checkUsernameUrl = GetConfigurationValue<string>('login.check-username.endpoint', '/api/auth/check-username');
    const interpretAvailability = (ok: boolean, status: number, payload: Record<string, unknown>): { available: boolean; error?: string } => {
        const isTrue = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
        const isFalse = (v: unknown) => v === false || v === 'false' || v === 0 || v === '0';

        if (ok) {
            if (isTrue(payload.available) || isFalse(payload.exists) || isFalse(payload.taken) || isFalse(payload.inUse) || isFalse(payload.in_use))
                return { available: true };
            if (isFalse(payload.available) || isTrue(payload.exists) || isTrue(payload.taken) || isTrue(payload.inUse) || isTrue(payload.in_use))
                return { available: false, error: typeof payload.error === 'string' ? payload.error : undefined };
            return { available: true };
        }

        if (status === 404 || status === 405 || status === 501) return { available: true };
        if (status === 409) return { available: false, error: typeof payload.error === 'string' ? payload.error : undefined };

        return { available: true };
    };

    const checkEmailAvailable = useCallback(
        async (email: string): Promise<{ available: boolean; error?: string }> => {
            try {
                const { ok, status, payload } = await postJson(checkEmailUrl, { email });
                const result = interpretAvailability(ok, status, payload);
                if (result.available) return { available: true };
                return { available: false, error: result.error || t('nitro.login.error.email_taken', 'This email is already in use.') };
            } catch {
                return { available: true };
            }
        },
        [checkEmailUrl, postJson]
    );

    const checkUsernameAvailable = useCallback(
        async (username: string): Promise<{ available: boolean; error?: string }> => {
            try {
                const { ok, status, payload } = await postJson(checkUsernameUrl, { username });
                const result = interpretAvailability(ok, status, payload);
                if (result.available) return { available: true };
                return { available: false, error: result.error || t('nitro.login.error.username_taken', 'This Habbo name is already taken.') };
            } catch {
                return { available: true };
            }
        },
        [checkUsernameUrl, postJson]
    );

    const handleRegisterSubmit = useCallback(
        async (
            body: { username: string; email: string; password: string; figure: string; gender: string; turnstileToken: string; templateId: number | null },
            onDialogReset: () => void
        ) => {
            if (turnstileEnabled && !body.turnstileToken) {
                setError(t('nitro.login.error.turnstile', 'Please complete the security check.'));
                return;
            }

            setError(null);
            setInfo(null);
            setSubmitting(true);

            try {
                const { ok, payload } = await postJson(registerUrl, {
                    username: body.username,
                    email: body.email,
                    password: body.password,
                    figure: body.figure,
                    gender: body.gender,
                    turnstileToken: turnstileEnabled ? body.turnstileToken : undefined,
                    templateId: body.templateId ?? undefined
                });

                if (ok) {
                    clearRegistrationDraft();
                    const friendly = t(
                        'nitro.login.register.success',
                        'Welcome aboard, %username%! Your account is ready — log in below with the password you just chose.',
                        ['username'],
                        [body.username]
                    );
                    setInfo(typeof payload.message === 'string' ? payload.message : friendly);
                    setMode('login');
                    setUsername(body.username);
                    setPassword('');
                    return;
                }

                setError(typeof payload.error === 'string' ? payload.error : t('nitro.login.error.register_failed', 'Unable to create your account.'));
                onDialogReset();
            } catch {
                setError(t('nitro.login.error.register_unreachable', 'Unable to reach the registration service.'));
                onDialogReset();
            } finally {
                setSubmitting(false);
            }
        },
        [turnstileEnabled, registerUrl, postJson]
    );

    const handleForgotSubmit = useCallback(
        async (body: { email: string; turnstileToken: string }, onDialogReset: () => void) => {
            if (turnstileEnabled && !body.turnstileToken) {
                setError(t('nitro.login.error.turnstile', 'Please complete the security check.'));
                return;
            }

            setError(null);
            setInfo(null);
            setSubmitting(true);

            try {
                const { ok, payload } = await postJson(forgotUrl, {
                    email: body.email,
                    turnstileToken: turnstileEnabled ? body.turnstileToken : undefined
                });

                if (ok) {
                    const friendly = t(
                        'nitro.login.forgot.success',
                        "Email sent! If an account matches that address you'll find a reset link in your inbox shortly (check spam if it doesn't show up within a minute)."
                    );
                    setInfo(typeof payload.message === 'string' ? payload.message : friendly);
                    setMode('login');
                    return;
                }

                setError(typeof payload.error === 'string' ? payload.error : t('nitro.login.error.forgot_failed', 'Unable to send a reset email right now.'));
                onDialogReset();
            } catch {
                setError(t('nitro.login.error.forgot_unreachable', 'Unable to reach the password reset service.'));
                onDialogReset();
            } finally {
                setSubmitting(false);
            }
        },
        [turnstileEnabled, forgotUrl, postJson]
    );

    return (
        <div className="octane-login-view" style={backgroundColor ? { background: backgroundColor } : undefined}>
            {background ? <img className="login-background login-layer login-layer-img" src={background} alt="" draggable={false} /> : null}
            {sun ? <img className="login-sun login-layer login-layer-img" src={sun} alt="" draggable={false} /> : null}
            {drape ? <img className="login-drape login-layer login-layer-img" src={drape} alt="" draggable={false} /> : null}
            {left ? <img className="login-left login-layer login-layer-img" src={left} alt="" draggable={false} /> : null}
            {rightRepeat ? <div className="login-right-repeat login-layer" style={{ backgroundImage: `url(${rightRepeat})` }} /> : null}
            {right ? <img className="login-right login-layer login-layer-img" src={right} alt="" draggable={false} /> : null}
            <div className="login-image-preloader" aria-hidden="true" data-version={loginImagesVersion}>
                {loginImageUrls.map((url) => (
                    <img key={url} src={url} decoding="async" loading="eager" alt="" />
                ))}
            </div>

            {loginWidgetSlots.length > 0 && (
                <div className="login-widgets">
                    {loginWidgetSlots.map((slot) => {
                        const image = typeof slot.conf.image === 'string' ? interpolate(slot.conf.image) : '';
                        const texts = typeof slot.conf.texts === 'string' ? slot.conf.texts : '';
                        const btnText = typeof slot.conf.btnText === 'string' ? slot.conf.btnText : '';
                        const btnLink = typeof slot.conf.btnLink === 'string' ? interpolate(slot.conf.btnLink) : '';
                        const title = typeof slot.conf.title === 'string' ? slot.conf.title : texts || slot.type;
                        const description = typeof slot.conf.description === 'string' ? slot.conf.description : '';

                        return (
                            <div key={slot.key} className="login-widget-slot" data-widget-type={slot.type}>
                                {image && <img className="login-widget-image" src={image} alt="" draggable={false} />}
                                <div className="login-widget-content">
                                    <div className="login-widget-title">{title}</div>
                                    {description && <div className="login-widget-description">{description}</div>}
                                    {btnText && (
                                        <button
                                            type="button"
                                            className="login-widget-button"
                                            onClick={() => {
                                                if (btnLink) window.location.href = btnLink;
                                            }}
                                        >
                                            {btnText}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {newsUrl && <NewsWindow newsUrl={newsUrl} />}

            <div className="login-language-picker octane-card-shell">
                <div className="login-language-header octane-card-header-shell">
                    <label className="octane-card-title" htmlFor="login-language-select">
                        {localeApplying ? t('nitro.login.language.loading', 'Loading...') : t('nitro.login.language.title', 'Language')}
                    </label>
                </div>
                <div className="login-language-content octane-card-content-shell">
                    <div className="login-language-select-wrap">
                        <img src={selectedLocale.flag} alt="" draggable={false} />
                        <select
                            id="login-language-select"
                            className="form-select"
                            value={selectedLocale.code}
                            disabled={localeApplying}
                            aria-label={t('nitro.login.language.aria', 'Language selection')}
                            onChange={(event) => void changeLocaleSelection(event.target.value)}
                        >
                            {LOGIN_LOCALES.map((locale) => (
                                <option key={locale.code} value={locale.code}>
                                    {locale.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    {localeError.length > 0 && <div className="language-error">{localeError}</div>}
                </div>
            </div>

            <div className="login-stack">
                <div className="octane-login-card octane-card-shell login-auth-card">
                    <div className="card-title octane-card-header-shell">
                        <span className="octane-card-title">{t('nitro.login.card.title', "What's your Habbo called?")}</span>
                    </div>
                    <form className="card-body octane-card-content-shell" action={submitLoginAction} autoComplete="on">
                        <div className="field">
                            <label htmlFor="login-username">{t('login.username', 'Name of your Habbo')}</label>
                            <input
                                id="login-username"
                                name="username"
                                autoComplete="username"
                                type="text"
                                maxLength={32}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="field">
                            <label htmlFor="login-password">{t('generic.password', 'Password')}</label>
                            <input
                                id="login-password"
                                name="password"
                                autoComplete="current-password"
                                type="password"
                                maxLength={128}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <label className="remember-row">
                            <input type="checkbox" name="remember" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                            <span>{t('login.remember_me', 'Remember me')}</span>
                        </label>
                        {turnstileEnabled && mode === 'login' && (
                            <TurnstileWidget
                                siteKey={turnstileSiteKey}
                                size="compact"
                                onToken={setLoginTurnstileToken}
                                onExpire={() => setLoginTurnstileToken('')}
                                onError={() => setLoginTurnstileToken('')}
                                resetSignal={loginTurnstileResetSignal}
                            />
                        )}
                        {loginServerReachable === false && (
                            <div className="error-line server-offline">
                                {t('nitro.login.server.offline.short', "The gameserver isn't running right now. Please try again in a moment.")}
                                <button type="button" className="retry-link" onClick={pingLoginServer} disabled={loginPingingServer}>
                                    {loginPingingServer ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.server.retry', 'Retry')}
                                </button>
                            </div>
                        )}
                        {error && <div className="error-line">{error}</div>}
                        {info && <div className="info-line">{info}</div>}
                        <div className="submit-row">
                            <LoginSubmitButton isEntering={isEntering} isLocked={isLocked} loginPingingServer={loginPingingServer} />
                        </div>
                        <a className="forgot" onClick={() => setMode('forgot')}>
                            {t('login.forgot_password', 'Forgotten your password?')}
                        </a>
                    </form>
                </div>

                <div className="octane-login-card octane-card-shell login-register-card">
                    <div className="card-title octane-card-header-shell">
                        <span className="octane-card-title">{t('nitro.login.firsttime.title', 'First time here?')}</span>
                    </div>
                    <div className="card-body octane-card-content-shell register-card-body">
                        <span>{t('nitro.login.firsttime.text', "Don't have a Habbo yet?")}</span>
                        <button type="button" className="register-link" onClick={() => setMode('register')}>
                            {t('nitro.login.firsttime.link', 'You can create one here')}
                        </button>
                    </div>
                </div>
            </div>

            {mode === 'register' && (
                <RegisterDialog
                    onCancel={closeDialog}
                    onSubmit={handleRegisterSubmit}
                    onCheckEmail={checkEmailAvailable}
                    onCheckUsername={checkUsernameAvailable}
                    onCheckServer={checkServerReachable}
                    submitting={submitting}
                    error={error}
                    info={info}
                    turnstileEnabled={turnstileEnabled}
                    turnstileSiteKey={turnstileSiteKey}
                    roomTemplatesUrl={roomTemplatesUrl}
                />
            )}

            {mode === 'forgot' && (
                <ForgotDialog
                    onCancel={closeDialog}
                    onSubmit={handleForgotSubmit}
                    submitting={submitting}
                    error={error}
                    info={info}
                    turnstileEnabled={turnstileEnabled}
                    turnstileSiteKey={turnstileSiteKey}
                />
            )}
        </div>
    );
};

interface DialogSharedProps {
    onCancel: () => void;
    submitting: boolean;
    error: string | null;
    info: string | null;
    turnstileEnabled: boolean;
    turnstileSiteKey: string;
}

interface RegisterDialogProps extends DialogSharedProps {
    onSubmit: (
        body: { username: string; email: string; password: string; figure: string; gender: string; turnstileToken: string; templateId: number | null },
        onDialogReset: () => void
    ) => Promise<void> | void;
    onCheckEmail: (email: string) => Promise<{ available: boolean; error?: string }>;
    onCheckUsername: (username: string) => Promise<{ available: boolean; error?: string }>;
    onCheckServer: () => Promise<boolean>;
    roomTemplatesUrl: string;
}

type RegisterStep = 'credentials' | 'avatar' | 'room';

interface RoomTemplate {
    templateId: number;
    title: string;
    description: string;
    thumbnail: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type GenderKey = 'M' | 'F';

const CORE_AVATAR_SET_TYPES = ['hr', 'hd', 'ch', 'lg', 'sh'];
const AVATAR_SET_TYPES = ['hd', 'hr', 'ha', 'he', 'ea', 'fa', 'ch', 'cp', 'cc', 'ca', 'lg', 'sh', 'wa'];

const FALLBACK_DEFAULTS: Record<GenderKey, Record<string, { partId: number; colors: number[] }>> = {
    M: {
        hr: { partId: 180, colors: [45] },
        hd: { partId: 180, colors: [1] },
        ch: { partId: 215, colors: [66] },
        lg: { partId: 270, colors: [82] },
        sh: { partId: 290, colors: [80] }
    },
    F: {
        hr: { partId: 515, colors: [45] },
        hd: { partId: 600, colors: [1] },
        ch: { partId: 660, colors: [100] },
        lg: { partId: 716, colors: [82] },
        sh: { partId: 725, colors: [61] }
    }
};

interface FigureColor {
    id: number;
    hexCode: string;
    club: number;
    selectable: boolean;
}
interface FigurePalette {
    id: number;
    colors: FigureColor[];
}
interface FigureSet {
    id: number;
    gender: 'M' | 'F' | 'U';
    club: number;
    selectable: boolean;
    sellable?: boolean;
}
interface FigureSetType {
    type: string;
    paletteId: number;
    sets: FigureSet[];
}
interface FigureData {
    palettes: FigurePalette[];
    setTypes: FigureSetType[];
}

interface PartSelection {
    partId: number;
    colors: number[];
}
type FigureSelection = Record<string, PartSelection>;

const buildFigureString = (selection: FigureSelection): string => {
    const seen = new Set<string>();
    const parts: string[] = [];
    const push = (setType: string) => {
        if (seen.has(setType)) return;
        seen.add(setType);
        const sel = selection[setType];
        if (!sel || sel.partId < 0) return;
        const tail = sel.colors && sel.colors.length ? `-${sel.colors.join('-')}` : '';
        parts.push(`${setType}-${sel.partId}${tail}`);
    };
    for (const setType of AVATAR_SET_TYPES) push(setType);
    for (const setType of Object.keys(selection)) push(setType);
    return parts.join('.');
};

const RegisterDialog: FC<RegisterDialogProps> = (props) => {
    const { onCancel, onSubmit, onCheckEmail, onCheckUsername, onCheckServer, submitting, error, info, turnstileEnabled, turnstileSiteKey, roomTemplatesUrl } =
        props;

    const [savedDraft] = useState(loadRegistrationDraft);
    const [step, setStep] = useState<RegisterStep>('credentials');
    const [resumeStep, setResumeStep] = useState<RegisterStep | null>(() => {
        if (!savedDraft || savedDraft.step === 'credentials') return null;
        if (turnstileEnabled && savedDraft.step === 'room') return 'avatar';
        return savedDraft.step;
    });
    const [draftRestored, setDraftRestored] = useState(Boolean(savedDraft));
    const [email, setEmail] = useState(savedDraft?.email ?? '');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [username, setUsername] = useState(savedDraft?.username ?? '');
    const [gender, setGender] = useState<GenderKey>(savedDraft?.gender ?? 'F');
    const [selection, setSelection] = useState<FigureSelection>(() => ({ ...FALLBACK_DEFAULTS[savedDraft?.gender ?? 'F'], ...savedDraft?.selection }));
    const [localError, setLocalError] = useState<string | null>(null);
    const [prevStep, setPrevStep] = useState<RegisterStep>(step);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [resetSignal, setResetSignal] = useState(0);
    const [roomTemplates, setRoomTemplates] = useState<RoomTemplate[] | null>(null);
    const [roomTemplatesError, setRoomTemplatesError] = useState<string | null>(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(savedDraft?.selectedTemplateId ?? null);

    const persistedDraft = useMemo(
        () => ({
            step: resumeStep ?? step,
            email: email.trim(),
            username: username.trim(),
            gender,
            selection,
            selectedTemplateId
        }),
        [step, resumeStep, email, username, gender, selection, selectedTemplateId]
    );
    const hasMeaningfulDraft = Boolean(
        persistedDraft.email || persistedDraft.username || persistedDraft.step !== 'credentials' || persistedDraft.selectedTemplateId !== null
    );
    const persistDraft = useCallback(() => {
        if (!hasMeaningfulDraft) {
            clearRegistrationDraft();
            return;
        }

        saveRegistrationDraft(persistedDraft);
    }, [hasMeaningfulDraft, persistedDraft]);

    useEffect(() => {
        const timer = window.setTimeout(persistDraft, 150);

        return () => window.clearTimeout(timer);
    }, [persistDraft]);

    useEffect(() => {
        window.addEventListener('pagehide', persistDraft);
        return () => window.removeEventListener('pagehide', persistDraft);
    }, [persistDraft]);

    const closeAndSaveDraft = useCallback(() => {
        persistDraft();
        onCancel();
    }, [persistDraft, onCancel]);

    if (prevStep !== step) {
        setPrevStep(step);
        setLocalError(null);
    }
    const [serverReachable, setServerReachable] = useState<boolean | null>(null);
    const [pingingServer, setPingingServer] = useState(false);

    const pingServer = useCallback(async () => {
        setPingingServer(true);
        try {
            const ok = await onCheckServer();
            setServerReachable(ok);
            return ok;
        } finally {
            setPingingServer(false);
        }
    }, [onCheckServer]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const ok = await onCheckServer();
            if (!cancelled) setServerReachable(ok);
        })();
        return () => {
            cancelled = true;
        };
    }, [onCheckServer]);

    const resetWidget = useCallback(() => {
        setTurnstileToken('');
        setResetSignal((prev) => prev + 1);
    }, []);

    const [figureData, setFigureData] = useState<FigureData | null>(null);
    const figureDataUrlRaw = GetConfigurationValue<string>('avatar.figuredata.url', '');
    const figureDataUrl = useMemo(() => {
        if (!figureDataUrlRaw) return '';
        try {
            return GetConfiguration().interpolate(figureDataUrlRaw);
        } catch {
            return figureDataUrlRaw;
        }
    }, [figureDataUrlRaw]);

    useEffect(() => {
        if (step !== 'avatar' || figureData || !figureDataUrl) return;
        let cancelled = false;
        fetch(figureDataUrl, { credentials: 'omit' })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                if (!cancelled && json) setFigureData(json as FigureData);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [step, figureData, figureDataUrl]);

    const partOptions = useMemo(() => {
        const result: Record<string, Record<GenderKey, number[]>> = {};
        if (!figureData) return result;
        for (const st of figureData.setTypes) {
            if (!AVATAR_SET_TYPES.includes(st.type)) continue;
            const forGender = (g: GenderKey) => [
                ...new Set(st.sets.filter((s) => s.selectable && s.club === 0 && !s.sellable && (s.gender === g || s.gender === 'U')).map((s) => s.id))
            ];
            result[st.type] = { M: forGender('M'), F: forGender('F') };
        }
        return result;
    }, [figureData]);

    const paletteOptions = useMemo(() => {
        const result: Record<string, { id: number; hex: string }[]> = {};
        if (!figureData) return result;
        for (const st of figureData.setTypes) {
            if (!AVATAR_SET_TYPES.includes(st.type)) continue;
            const palette = figureData.palettes.find((p) => p.id === st.paletteId);
            if (!palette) {
                result[st.type] = [];
                continue;
            }
            result[st.type] = palette.colors.filter((c) => c.selectable && c.club === 0).map((c) => ({ id: c.id, hex: '#' + c.hexCode.toUpperCase() }));
        }
        return result;
    }, [figureData]);

    const [hotLooks, setHotLooks] = useState<{ gender: GenderKey; figure: string }[]>([]);
    const [hotLookIndex, setHotLookIndex] = useState(-1);

    useEffect(() => {
        if (step !== 'avatar' || hotLooks.length) return;
        let cancelled = false;
        fetch(configFileUrl('hotlooks.json', true), { credentials: 'omit' })
            .then((r) => (r.ok ? r.json() : null))
            .then((json: unknown) => {
                if (cancelled || !Array.isArray(json)) return;
                const parsed: { gender: GenderKey; figure: string }[] = [];
                for (const entry of json as Record<string, unknown>[]) {
                    const rawGender = typeof entry._gender === 'string' ? entry._gender.toUpperCase() : '';
                    const figure = typeof entry._figure === 'string' ? entry._figure : '';
                    if ((rawGender !== 'M' && rawGender !== 'F') || !figure) continue;
                    parsed.push({ gender: rawGender, figure });
                }
                if (parsed.length) setHotLooks(parsed);
            })
            .catch(() => {});
        return () => {
            cancelled = true;
        };
    }, [step, hotLooks.length]);

    const applyLook = useCallback((figure: string, lookGender: GenderKey) => {
        const next: FigureSelection = {};
        for (const setPart of figure.split('.')) {
            const bits = setPart.split('-');
            if (bits.length < 2) continue;
            const setType = bits[0];
            if (!AVATAR_SET_TYPES.includes(setType)) continue;
            const partId = parseInt(bits[1], 10);
            if (!setType || Number.isNaN(partId)) continue;
            const colors: number[] = [];
            for (let i = 2; i < bits.length; i++) {
                const c = parseInt(bits[i], 10);
                if (!Number.isNaN(c)) colors.push(c);
            }
            next[setType] = { partId, colors };
        }

        for (const setType of CORE_AVATAR_SET_TYPES) {
            if (!next[setType]) next[setType] = { ...FALLBACK_DEFAULTS[lookGender][setType] };
        }
        setGender(lookGender);
        setSelection(next);
    }, []);

    const cycleHotLook = useCallback(() => {
        if (!hotLooks.length) return;
        const nextIdx = (hotLookIndex + 1) % hotLooks.length;
        setHotLookIndex(nextIdx);
        const look = hotLooks[nextIdx];
        applyLook(look.figure, look.gender);
    }, [hotLooks, hotLookIndex, applyLook]);

    const credentialsValid = EMAIL_REGEX.test(email.trim()) && password.length >= 8 && password === confirm;

    const credentialsAction = useCallback(
        async (_prev: null, _formData: FormData): Promise<null> => {
            setLocalError(null);

            if (!email.trim() || !password || !confirm) {
                setLocalError(t('nitro.login.error.missing_fields', 'Please fill in every field.'));
                return null;
            }
            if (!EMAIL_REGEX.test(email.trim())) {
                setLocalError(t('nitro.login.error.invalid_email', 'Please enter a valid email address.'));
                return null;
            }
            if (password.length < 8) {
                setLocalError(t('nitro.login.error.password_too_short', 'Your password must be at least 8 characters.'));
                return null;
            }
            if (password !== confirm) {
                setLocalError(t('nitro.login.error.password_mismatch', 'Passwords do not match.'));
                return null;
            }

            const serverOk = await pingServer();
            if (!serverOk) {
                setLocalError(t('nitro.login.error.server_offline', 'The gameserver is not running. Please try again later.'));
                return null;
            }

            const result = await onCheckEmail(email.trim());
            if (!result.available) {
                setLocalError(result.error || t('nitro.login.error.email_taken', 'This email is already in use.'));
                return null;
            }

            setStep(resumeStep ?? 'avatar');
            setResumeStep(null);
            setDraftRestored(false);
            return null;
        },
        [email, password, confirm, pingServer, onCheckEmail, resumeStep]
    );

    const [, submitCredentialsAction, isCredentialsPending] = useActionState<null, FormData>(credentialsAction, null);

    const applyGender = (newGender: GenderKey) => {
        setGender(newGender);
        setSelection({ ...FALLBACK_DEFAULTS[newGender] });
        setHotLookIndex(-1);
    };

    const getPartList = useCallback(
        (setType: string): number[] => {
            const loaded = partOptions[setType]?.[gender];
            if (loaded && loaded.length) return loaded;
            const fallback = FALLBACK_DEFAULTS[gender][setType]?.partId;
            return fallback !== undefined ? [fallback] : [];
        },
        [partOptions, gender]
    );

    const getColorList = useCallback(
        (setType: string): number[] => {
            const loaded = paletteOptions[setType];
            if (loaded && loaded.length) return loaded.map((c) => c.id);
            const fallback = FALLBACK_DEFAULTS[gender][setType]?.colors?.[0];
            return fallback !== undefined ? [fallback] : [];
        },
        [paletteOptions, gender]
    );

    const selectWardrobePart = useCallback(
        (setType: string, partId: number) => {
            const availableColors = getColorList(setType);
            setSelection((prev) => ({
                ...Object.fromEntries(Object.entries(prev).filter(([type]) => type !== setType)),
                ...(partId >= 0
                    ? {
                          [setType]: {
                              partId,
                              colors: prev[setType]?.colors?.length ? prev[setType].colors : availableColors.slice(0, 1)
                          }
                      }
                    : {})
            }));
            setHotLookIndex(-1);
        },
        [getColorList]
    );

    const selectWardrobeColor = useCallback((setType: string, colorId: number) => {
        setSelection((prev) => ({
            ...prev,
            [setType]: {
                partId: prev[setType]?.partId ?? -1,
                colors: [colorId]
            }
        }));
        setHotLookIndex(-1);
    }, []);

    const canRandomizeLook = useMemo(() => AVATAR_SET_TYPES.some((setType) => (partOptions[setType]?.[gender]?.length ?? 0) > 1), [partOptions, gender]);

    const randomizeLook = useCallback(() => {
        if (!canRandomizeLook) return;

        const randomItem = <T,>(items: T[]): T | undefined => items[Math.floor(Math.random() * items.length)];
        const nextSelection: FigureSelection = {};

        for (const setType of AVATAR_SET_TYPES) {
            const partIds = getPartList(setType);
            const colorIds = getColorList(setType);
            const isOptional = !CORE_AVATAR_SET_TYPES.includes(setType);

            if (isOptional && Math.random() < 0.55) continue;

            const partId = randomItem(partIds);

            if (partId === undefined) continue;

            nextSelection[setType] = {
                partId,
                colors: colorIds.length ? [randomItem(colorIds) ?? colorIds[0]] : []
            };
        }

        setSelection(nextSelection);
        setHotLookIndex(-1);
    }, [canRandomizeLook, getPartList, getColorList]);

    const figure = buildFigureString(selection);

    const avatarAction = useCallback(
        async (_prev: null, _formData: FormData): Promise<null> => {
            setLocalError(null);

            const trimmed = username.trim();
            if (!trimmed) {
                setLocalError(t('nitro.login.error.missing_username', 'Please choose a Habbo name.'));
                return null;
            }
            if (trimmed.length < 3 || trimmed.length > 16) {
                setLocalError(t('nitro.login.error.username_length', 'Habbo name must be 3–16 characters.'));
                return null;
            }

            if (turnstileEnabled && !turnstileToken) {
                setLocalError(t('nitro.login.error.turnstile', 'Please complete the security check.'));
                return null;
            }

            const serverOk = await pingServer();
            if (!serverOk) {
                setLocalError(t('nitro.login.error.server_offline', 'The gameserver is not running. Please try again later.'));
                return null;
            }

            const result = await onCheckUsername(trimmed);
            if (!result.available) {
                setLocalError(result.error || t('nitro.login.error.username_taken', 'This Habbo name is already taken.'));
                return null;
            }

            setStep('room');
            return null;
        },
        [username, turnstileEnabled, turnstileToken, pingServer, onCheckUsername]
    );

    const [, submitAvatarAction, isAvatarPending] = useActionState<null, FormData>(avatarAction, null);

    const roomAction = useCallback(
        async (_prev: null, _formData: FormData): Promise<null> => {
            setLocalError(null);

            await onSubmit(
                {
                    username: username.trim(),
                    email: email.trim(),
                    password,
                    figure: buildFigureString(selection),
                    gender,
                    turnstileToken,
                    templateId: selectedTemplateId
                },
                resetWidget
            );

            return null;
        },
        [onSubmit, username, email, password, selection, gender, turnstileToken, selectedTemplateId, resetWidget]
    );

    const [, submitRoomAction, isRoomPending] = useActionState<null, FormData>(roomAction, null);

    useEffect(() => {
        if (step !== 'room' || roomTemplates !== null || !roomTemplatesUrl) return;
        let cancelled = false;
        setRoomTemplatesError(null);
        fetch(roomTemplatesUrl, { credentials: 'include' })
            .then(async (r) => {
                if (!r.ok) throw new Error(`status ${r.status}`);
                return r.json();
            })
            .then((json) => {
                if (cancelled) return;
                const list = Array.isArray((json as { templates?: unknown })?.templates) ? (json as { templates: RoomTemplate[] }).templates : [];
                setRoomTemplates(list);
            })
            .catch(() => {
                if (cancelled) return;
                setRoomTemplates([]);
                setRoomTemplatesError(t('nitro.login.register.room.error', 'Could not load room options. You can still skip this step.'));
            });
        return () => {
            cancelled = true;
        };
    }, [step, roomTemplates, roomTemplatesUrl]);

    const busy = submitting || isCredentialsPending || isAvatarPending || isRoomPending || pingingServer;
    const serverOffline = serverReachable === false;

    return (
        <LoginModal
            title={t('nitro.login.register.title', 'Habbo Details')}
            titleId="register-dialog-title"
            closeLabel={t('generic.close', 'Close')}
            dialogClassName={`${step === 'avatar' ? 'dialog-avatar' : ''} ${step === 'room' ? 'dialog-room' : ''}`}
            onClose={closeAndSaveDraft}
        >
            {step === 'credentials' && (
                <form className="card-body octane-card-content-shell" action={submitCredentialsAction} autoComplete="on">
                    <div className="register-intro octane-card-panel">
                        {t(
                            'nitro.login.register.intro.credentials',
                            "Let's create your account. Enter your email and pick a password — we'll check that email isn't already in use."
                        )}
                    </div>
                    {draftRestored && (
                        <div className="info-line">
                            {t(
                                'nitro.login.register.draft.restored',
                                'Your signup draft was restored. For security, re-enter your password to continue where you left off.'
                            )}
                        </div>
                    )}
                    {serverOffline && (
                        <div className="error-line server-offline">
                            {t(
                                'nitro.login.server.offline.long',
                                "The gameserver isn't running right now, so new accounts can't be created. Please try again in a moment."
                            )}
                            <button type="button" className="retry-link" onClick={pingServer} disabled={pingingServer}>
                                {pingingServer ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.server.retry', 'Retry')}
                            </button>
                        </div>
                    )}
                    <div className="field">
                        <label htmlFor="register-email">{t('nitro.login.forgot.email.label', 'Email')}</label>
                        <input
                            id="register-email"
                            name="email"
                            type="email"
                            maxLength={120}
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="register-password">{t('generic.password', 'Password')}</label>
                        <input
                            id="register-password"
                            name="password"
                            type="password"
                            maxLength={128}
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <div className="field">
                        <label htmlFor="register-confirm">{t('nitro.login.register.confirm.label', 'Confirm password')}</label>
                        <input
                            id="register-confirm"
                            name="confirm"
                            type="password"
                            maxLength={128}
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />
                    </div>
                    {(localError || error) && <div className="error-line">{localError || error}</div>}
                    {info && <div className="info-line">{info}</div>}
                    <div className="step-footer">
                        <span className="step-indicator">1/3</span>
                        <button type="submit" className="ok-button" disabled={!credentialsValid || busy || serverOffline}>
                            {isCredentialsPending || pingingServer ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.register.next', 'Next')}
                        </button>
                    </div>
                </form>
            )}

            {step === 'avatar' && (
                <form className="card-body octane-card-content-shell" action={submitAvatarAction} autoComplete="on">
                    <div className="register-intro octane-card-panel">
                        {t(
                            'nitro.login.register.intro.avatar',
                            "Now it's time to make your own Habbo character! To make your own Habbo, please start by choosing your Habbo Name."
                        )}
                    </div>
                    {serverOffline && (
                        <div className="error-line server-offline">
                            {t(
                                'nitro.login.server.offline.long',
                                "The gameserver isn't running right now, so new accounts can't be created. Please try again in a moment."
                            )}
                            <button type="button" className="retry-link" onClick={pingServer} disabled={pingingServer}>
                                {pingingServer ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.server.retry', 'Retry')}
                            </button>
                        </div>
                    )}
                    <div className="field">
                        <input
                            id="register-username"
                            type="text"
                            maxLength={16}
                            autoComplete="username"
                            placeholder={t('nitro.login.register.username.placeholder', 'HabboName')}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="gender-row">
                        <label>
                            <input type="radio" name="register-gender" checked={gender === 'F'} onChange={() => applyGender('F')} />
                            <span>{t('nitro.login.register.gender.girl', 'Girl')}</span>
                        </label>
                        <label>
                            <input type="radio" name="register-gender" checked={gender === 'M'} onChange={() => applyGender('M')} />
                            <span>{t('nitro.login.register.gender.boy', 'Boy')}</span>
                        </label>
                    </div>

                    <RegistrationAvatarWardrobe
                        gender={gender}
                        figure={figure}
                        selection={selection}
                        partOptions={partOptions}
                        paletteOptions={paletteOptions}
                        onSelectPart={selectWardrobePart}
                        onSelectColor={selectWardrobeColor}
                    />

                    <div className="hot-looks-row">
                        <button
                            type="button"
                            className="ok-button hot-looks-button"
                            onClick={cycleHotLook}
                            disabled={!hotLooks.length || busy}
                            title={
                                hotLooks.length
                                    ? t('nitro.login.register.hotlooks.count', '%count% looks available', ['count'], [String(hotLooks.length)])
                                    : t('nitro.login.register.hotlooks.none', 'No hot looks loaded')
                            }
                        >
                            {t('nitro.login.register.hotlooks', 'Hot Looks')}
                            {hotLookIndex >= 0 && hotLooks.length ? ` (${hotLookIndex + 1}/${hotLooks.length})` : ''}
                        </button>
                        <button
                            type="button"
                            className="ok-button back-button hot-looks-button random-look-button"
                            onClick={randomizeLook}
                            disabled={!canRandomizeLook || busy}
                            title={t('nitro.login.register.randomlook.title', 'Generate a random look')}
                        >
                            <FaDice aria-hidden="true" />
                            {t('nitro.login.register.randomlook', 'Random Look')}
                        </button>
                    </div>

                    {turnstileEnabled && (
                        <TurnstileWidget
                            siteKey={turnstileSiteKey}
                            size="compact"
                            onToken={setTurnstileToken}
                            onExpire={() => setTurnstileToken('')}
                            onError={() => setTurnstileToken('')}
                            resetSignal={resetSignal}
                        />
                    )}
                    {(localError || error) && <div className="error-line">{localError || error}</div>}
                    {info && <div className="info-line">{info}</div>}

                    <div className="step-footer step-footer-split">
                        <button type="button" className="ok-button back-button" onClick={() => setStep('credentials')} disabled={busy}>
                            {t('nitro.login.register.back', 'Back')}
                        </button>
                        <span className="step-indicator">2/3</span>
                        <button type="submit" className="ok-button" disabled={!username.trim() || busy || serverOffline}>
                            {isAvatarPending
                                ? t('nitro.login.server.checking', 'Checking…')
                                : pingingServer
                                  ? t('nitro.login.server.checking', 'Checking…')
                                  : t('nitro.login.register.next', 'Next')}
                        </button>
                    </div>
                </form>
            )}

            {step === 'room' && (
                <form className="card-body octane-card-content-shell" action={submitRoomAction} autoComplete="off">
                    <div className="register-intro octane-card-panel">
                        {t('nitro.login.register.intro.room', 'Last step — pick a starter room, or skip and create your own later.')}
                    </div>

                    {serverOffline && (
                        <div className="error-line server-offline">
                            {t(
                                'nitro.login.server.offline.long',
                                "The gameserver isn't running right now, so new accounts can't be created. Please try again in a moment."
                            )}
                            <button type="button" className="retry-link" onClick={pingServer} disabled={pingingServer}>
                                {pingingServer ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.server.retry', 'Retry')}
                            </button>
                        </div>
                    )}

                    <div className="room-templates-list">
                        <label className={`room-template-option room-template-skip ${selectedTemplateId === null ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="register-room-template"
                                checked={selectedTemplateId === null}
                                onChange={() => setSelectedTemplateId(null)}
                            />
                            <div className="room-template-body">
                                <div className="room-template-title">{t('nitro.login.register.room.skip.title', "I'm okay — I'll create my own rooms")}</div>
                                <div className="room-template-description">
                                    {t('nitro.login.register.room.skip.description', 'Skip for now and start with an empty hotel inventory.')}
                                </div>
                            </div>
                        </label>

                        {roomTemplates === null && <div className="info-line">{t('nitro.login.register.room.loading', 'Loading rooms…')}</div>}

                        {roomTemplates !== null &&
                            roomTemplates.map((template) => (
                                <label
                                    key={template.templateId}
                                    className={`room-template-option ${selectedTemplateId === template.templateId ? 'selected' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="register-room-template"
                                        checked={selectedTemplateId === template.templateId}
                                        onChange={() => setSelectedTemplateId(template.templateId)}
                                    />
                                    {template.thumbnail && (
                                        <img
                                            className="room-template-thumb"
                                            src={template.thumbnail}
                                            alt={template.title}
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
                                            }}
                                        />
                                    )}
                                    <div className="room-template-body">
                                        <div className="room-template-title">{template.title}</div>
                                        {template.description && <div className="room-template-description">{template.description}</div>}
                                    </div>
                                </label>
                            ))}
                    </div>

                    {roomTemplatesError && <div className="error-line">{roomTemplatesError}</div>}
                    {(localError || error) && <div className="error-line">{localError || error}</div>}
                    {info && <div className="info-line">{info}</div>}

                    <div className="step-footer step-footer-split">
                        <button type="button" className="ok-button back-button" onClick={() => setStep('avatar')} disabled={busy}>
                            {t('nitro.login.register.back', 'Back')}
                        </button>
                        <span className="step-indicator">3/3</span>
                        <button type="submit" className="ok-button" disabled={busy || serverOffline}>
                            {submitting || isRoomPending ? t('nitro.login.register.creating', 'Creating…') : t('nitro.login.register.finish', 'Finish')}
                        </button>
                    </div>
                </form>
            )}
        </LoginModal>
    );
};

interface ForgotDialogProps extends DialogSharedProps {
    onSubmit: (body: { email: string; turnstileToken: string }, onDialogReset: () => void) => Promise<void> | void;
}

const ForgotSubmitButton: FC = () => {
    const { pending } = useFormStatus();

    return (
        <button type="submit" className="ok-button" disabled={pending}>
            {t('nitro.login.forgot.send', 'Send email')}
        </button>
    );
};

const ForgotDialog: FC<ForgotDialogProps> = (props) => {
    const { onCancel, onSubmit, error, info, turnstileEnabled, turnstileSiteKey } = props;
    const [email, setEmail] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [resetSignal, setResetSignal] = useState(0);

    const resetWidget = useCallback(() => {
        setTurnstileToken('');
        setResetSignal((prev) => prev + 1);
    }, []);

    const forgotAction = useCallback(
        async (_prev: null, formData: FormData): Promise<null> => {
            setLocalError(null);

            const emailInput = String(formData.get('email') || '').trim();

            if (!emailInput) {
                setLocalError(t('nitro.login.error.missing_email', 'Please enter your email address.'));
                return null;
            }

            await onSubmit({ email: emailInput, turnstileToken }, resetWidget);
            return null;
        },
        [onSubmit, turnstileToken, resetWidget]
    );

    const [, submitForgotAction] = useActionState<null, FormData>(forgotAction, null);

    return (
        <LoginModal
            title={t('nitro.login.forgot.title', 'Reset password')}
            titleId="forgot-dialog-title"
            closeLabel={t('generic.close', 'Close')}
            onClose={onCancel}
        >
            <form className="card-body octane-card-content-shell" action={submitForgotAction} autoComplete="on">
                <div className="field">
                    <label htmlFor="forgot-email">{t('nitro.login.forgot.email.label', 'Email address')}</label>
                    <input
                        id="forgot-email"
                        name="email"
                        type="email"
                        maxLength={120}
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                {turnstileEnabled && (
                    <TurnstileWidget
                        siteKey={turnstileSiteKey}
                        size="compact"
                        onToken={setTurnstileToken}
                        onExpire={() => setTurnstileToken('')}
                        onError={() => setTurnstileToken('')}
                        resetSignal={resetSignal}
                    />
                )}
                {(localError || error) && <div className="error-line">{localError || error}</div>}
                {info && <div className="info-line">{info}</div>}
                <div className="submit-row">
                    <ForgotSubmitButton />
                </div>
            </form>
        </LoginModal>
    );
};
