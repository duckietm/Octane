import { GetConfiguration, GetLocalizationManager, GetSessionDataManager, TranslationLanguagesEvent, TranslationLanguagesRequestComposer, TranslationResultEvent, TranslationTextRequestComposer } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { LocalStorageKeys, SendMessageComposer } from '../../api';
import { parseJsonDocument } from '../../json/JsonDocumentParser';
import { useMessageEvent } from '../events';
import { useLocalStorage } from '../useLocalStorage';

const REQUEST_TIMEOUT_MS = 8000;
const OUTGOING_QUEUE_TTL_MS = 30000;

export interface ITranslationSettings
{
    enabled: boolean;
    incomingTargetLanguage: string;
    outgoingTargetLanguage: string;
    uiTextLanguage: string;
}

export interface ITranslationLanguage
{
    code: string;
    name: string;
}

export interface ITranslationTextLocale extends ITranslationLanguage
{
    file: string;
}

export interface IResolvedTranslation
{
    originalText: string;
    translatedText: string;
    detectedLanguage: string;
    targetLanguage: string;
}

interface IPendingTranslationRequest
{
    resolve: (translation: IResolvedTranslation) => void;
    reject: (error: Error) => void;
    timeoutId: number;
}

interface IQueuedOutgoingTranslation extends IResolvedTranslation
{
    expiresAt: number;
}

const normalizeLanguageCode = (value: string) =>
{
    if(!value || !value.trim().length) return '';

    const normalized = value.trim().replace('_', '-');
    const parts = normalized.split('-');

    if(parts.length === 1) return parts[0].toLowerCase();

    return `${ parts[0].toLowerCase() }-${ parts[1].toUpperCase() }`;
};

// UI-text locales backed by the per-language UITexts_<file>.json files in
// gamedata. `file` must match the UITexts_<file>.json filename, since
// external.texts.translation.url is `.../UITexts_%locale%.json`.
const TEXT_TRANSLATION_LOCALES: ITranslationTextLocale[] = [
    { code: 'en', name: 'English', file: 'en' },
    { code: 'it', name: 'Italian', file: 'it' },
    { code: 'nl', name: 'Dutch', file: 'nl' },
    { code: 'fr', name: 'French', file: 'fr' },
    { code: 'es', name: 'Spanish', file: 'es' },
    { code: 'ar', name: 'Arabic', file: 'ar' }
];

const resolveTextTranslationLocale = (value: string) =>
{
    const normalizedValue = normalizeLanguageCode(value);

    if(!normalizedValue.length) return null;

    const exactMatch = TEXT_TRANSLATION_LOCALES.find(locale => (normalizeLanguageCode(locale.code) === normalizedValue));

    if(exactMatch) return exactMatch;

    const normalizedBase = normalizedValue.split('-')[0];

    if(normalizedBase === 'pt') return TEXT_TRANSLATION_LOCALES.find(locale => (locale.file === 'br')) || null;

    return TEXT_TRANSLATION_LOCALES.find(locale => (normalizeLanguageCode(locale.code).split('-')[0] === normalizedBase)) || null;
};

const interpolateTranslationUrl = (template: string, file: string) =>
{
    if(!template || !template.length) return '';

    return GetConfiguration().interpolate(
        template
            .replace(/%locale%/gi, file)
            .replace(/%timestamp%/gi, Date.now().toString()));
};

const getTextTranslationUrl = (file: string) =>
{
    const configuredTranslationUrl = GetConfiguration().getValue<string>('external.texts.translation.url') || '';

    if(configuredTranslationUrl.length)
    {
        return interpolateTranslationUrl(configuredTranslationUrl, file);
    }

    const externalTextUrls = GetConfiguration().getValue<string[]>('external.texts.url') || [];
    const externalTextsUrl = externalTextUrls.length ? GetConfiguration().interpolate(externalTextUrls[0]) : '';

    if(!externalTextsUrl.length) return `/text_translate/ExternalTexts_${ file }.json`;

    const lastSlashIndex = externalTextsUrl.lastIndexOf('/');

    if(lastSlashIndex === -1) return `text_translate/ExternalTexts_${ file }.json`;

    const basePath = externalTextsUrl.substring(0, lastSlashIndex);

    return `${ basePath }/text_translate/ExternalTexts_${ file }.json`;
};

const getBundledTextTranslationUrl = (file: string) =>
{
    const relativeUrl = `configuration/UITexts_${ file }.jsonc.example`;

    if(typeof document === 'undefined') return `/${ relativeUrl }`;

    return new URL(relativeUrl, document.baseURI).toString();
};

const loadTextTranslationData = async (file: string, configuredUrl: string): Promise<Record<string, string>> =>
{
    const urls = Array.from(new Set([ configuredUrl, getBundledTextTranslationUrl(file) ].filter(Boolean)));
    let lastError: unknown = null;

    for(const url of urls)
    {
        try
        {
            const response = await fetch(url);

            if(!response.ok) throw new Error(`Unable to load ${ url }`);

            const data = parseJsonDocument<Record<string, unknown>>(await response.text(), 'jsonc', url);

            if(!data || (typeof data !== 'object') || Array.isArray(data)) throw new Error(`Invalid translation data from ${ url }`);

            return Object.fromEntries(Object.entries(data).filter((entry): entry is [string, string] => (typeof entry[1] === 'string')));
        }
        catch(error)
        {
            lastError = error;
        }
    }

    throw lastError instanceof Error ? lastError : new Error(`Unable to load translations for ${ file }`);
};

const getFurnitureTranslationUrl = (file: string) =>
{
    const configuredTranslationUrl = GetConfiguration().getValue<string>('furnidata.translation.url') || '';

    if(configuredTranslationUrl.length)
    {
        return interpolateTranslationUrl(configuredTranslationUrl, file);
    }

    const furnidataUrl = GetConfiguration().interpolate(GetConfiguration().getValue<string>('furnidata.url') || '');

    if(!furnidataUrl.length) return `/furniture_translate/FurnitureData_${ file }.json`;

    const lastSlashIndex = furnidataUrl.lastIndexOf('/');

    if(lastSlashIndex === -1) return `furniture_translate/FurnitureData_${ file }.json`;

    const basePath = furnidataUrl.substring(0, lastSlashIndex);

    return `${ basePath }/furniture_translate/FurnitureData_${ file }.json`;
};

const dispatchLocalizationUpdated = () =>
{
    if(typeof window === 'undefined') return;

    window.dispatchEvent(new CustomEvent('octane-localization-updated'));
};

export const applyTextTranslationLocale = async (languageCode: string): Promise<void> =>
{
    const localizationManager = GetLocalizationManager();
    const sessionDataManager = GetSessionDataManager();
    const selectedLocale = resolveTextTranslationLocale(languageCode || '');

    if(!selectedLocale)
    {
        localizationManager.clearOverrideValues();
        sessionDataManager.clearFurnitureDataOverrides();
        dispatchLocalizationUpdated();
        return;
    }

      // The base ExternalTexts/UITexts files are already written in one language,
    // so loading an override pack for that same language would be redundant.
    // Which language that is depends on the hotel: set `base.locale` in
    // renderer-config.json (defaults to English).
    const baseLocale = normalizeLanguageCode(GetConfiguration().getValue<string>('base.locale') || 'en') || 'en';

    if(selectedLocale.file === baseLocale)
    {
        localizationManager.clearOverrideValues();
        sessionDataManager.clearFurnitureDataOverrides();
        dispatchLocalizationUpdated();
        return;
    }

    const textUrl = getTextTranslationUrl(selectedLocale.file);
    const furnitureUrl = getFurnitureTranslationUrl(selectedLocale.file);
    const data = await loadTextTranslationData(selectedLocale.file, textUrl);
    const overrideValues = new Map<string, string>();

    Object.keys(data || {}).forEach(key => overrideValues.set(key, data[key]));
    localizationManager.setOverrideValues(overrideValues);

    dispatchLocalizationUpdated();

    void sessionDataManager.applyFurnitureDataOverrides(furnitureUrl).catch(() => sessionDataManager.clearFurnitureDataOverrides());
};

const getBrowserLanguageCode = () =>
{
    if(typeof navigator === 'undefined') return 'en';

    return normalizeLanguageCode(navigator.language || 'en').split('-')[0] || 'en';
};

const decodeHtmlEntities = (value: string) =>
{
    if(!value || (typeof window === 'undefined')) return value;

    const textarea = document.createElement('textarea');

    textarea.innerHTML = value;

    return textarea.value;
};

const resolveSupportedLanguage = (value: string, languages: ITranslationLanguage[]) =>
{
    const normalizedValue = normalizeLanguageCode(value);

    if(!languages.length) return normalizedValue || 'en';

    const exactMatch = languages.find(language => (normalizeLanguageCode(language.code) === normalizedValue));

    if(exactMatch) return exactMatch.code;

    const normalizedBase = normalizedValue.split('-')[0];
    const baseMatch = languages.find(language => (normalizeLanguageCode(language.code).split('-')[0] === normalizedBase));

    if(baseMatch) return baseMatch.code;

    const englishMatch = languages.find(language => (normalizeLanguageCode(language.code).split('-')[0] === 'en'));

    if(englishMatch) return englishMatch.code;

    return languages[0].code;
};

const useTranslationStore = () =>
{
    const defaultTargetLanguage = getBrowserLanguageCode();
    const [ settings, setSettings ] = useLocalStorage<ITranslationSettings>(LocalStorageKeys.CHAT_TRANSLATION_SETTINGS, {
        enabled: false,
        incomingTargetLanguage: defaultTargetLanguage,
        outgoingTargetLanguage: defaultTargetLanguage,
        uiTextLanguage: ''
    });
    const [ supportedLanguages, setSupportedLanguages ] = useState<ITranslationLanguage[]>([]);
    const [ availableTextLocales ] = useState<ITranslationTextLocale[]>(TEXT_TRANSLATION_LOCALES);
    const [ languagesLoading, setLanguagesLoading ] = useState(false);
    const [ languagesLoaded, setLanguagesLoaded ] = useState(false);
    const [ localizationTextsLoading, setLocalizationTextsLoading ] = useState(false);
    const [ lastIncomingLanguage, setLastIncomingLanguage ] = useState('');
    const [ lastOutgoingLanguage, setLastOutgoingLanguage ] = useState('');
    const [ lastError, setLastError ] = useState('');
    const requestIdRef = useRef(0);
    const languagesTimeoutRef = useRef(0);
    const pendingRequestsRef = useRef(new Map<number, IPendingTranslationRequest>());
    const translationCacheRef = useRef(new Map<string, IResolvedTranslation>());
    const outgoingQueueRef = useRef(new Map<string, IQueuedOutgoingTranslation[]>());
    const localizationRequestRef = useRef(0);

    const clearLanguagesTimeout = useCallback(() =>
    {
        if(!languagesTimeoutRef.current) return;

        window.clearTimeout(languagesTimeoutRef.current);
        languagesTimeoutRef.current = 0;
    }, []);

    const pruneOutgoingQueue = useCallback(() =>
    {
        const now = Date.now();

        outgoingQueueRef.current.forEach((entries, key) =>
        {
            const activeEntries = entries.filter(entry => (entry.expiresAt > now));

            if(activeEntries.length)
            {
                outgoingQueueRef.current.set(key, activeEntries);
                return;
            }

            outgoingQueueRef.current.delete(key);
        });
    }, []);

    const updateSettings = useCallback((partial: Partial<ITranslationSettings>) =>
    {
        setSettings(prevValue => ({ ...prevValue, ...partial }));
    }, [ setSettings ]);

    const getLanguageName = useCallback((languageCode: string) =>
    {
        const normalizedLanguageCode = normalizeLanguageCode(languageCode);

        if(!normalizedLanguageCode.length) return 'auto';

        const exactMatch = supportedLanguages.find(language => (normalizeLanguageCode(language.code) === normalizedLanguageCode));

        if(exactMatch) return exactMatch.name;

        const normalizedBase = normalizedLanguageCode.split('-')[0];
        const baseMatch = supportedLanguages.find(language => (normalizeLanguageCode(language.code).split('-')[0] === normalizedBase));

        return baseMatch?.name || normalizedLanguageCode;
    }, [ supportedLanguages ]);

    const handleLanguagesEvent = useCallback((event: TranslationLanguagesEvent) =>
    {
        const parser = event.getParser();

        clearLanguagesTimeout();
        setLanguagesLoading(false);

        if(!parser.success)
        {
            setLanguagesLoaded(false);
            setLastError(parser.errorMessage || 'Unable to load Google Translate languages.');
            return;
        }

        const nextLanguages = parser.languages.map(language => ({
            code: normalizeLanguageCode(language.code),
            name: language.name
        }));

        setSupportedLanguages(nextLanguages);
        setLanguagesLoaded(true);
        setLastError('');
    }, [ clearLanguagesTimeout ]);

    const handleTranslationResult = useCallback((event: TranslationResultEvent) =>
    {
        const parser = event.getParser();
        const pendingRequest = pendingRequestsRef.current.get(parser.requestId);

        if(!pendingRequest) return;

        window.clearTimeout(pendingRequest.timeoutId);
        pendingRequestsRef.current.delete(parser.requestId);

        if(!parser.success)
        {
            pendingRequest.reject(new Error(parser.errorMessage || 'Unable to translate text.'));
            return;
        }

        pendingRequest.resolve({
            originalText: decodeHtmlEntities(parser.originalText || ''),
            translatedText: decodeHtmlEntities(parser.translatedText || ''),
            detectedLanguage: normalizeLanguageCode(parser.detectedLanguage || ''),
            targetLanguage: normalizeLanguageCode(parser.targetLanguage || '')
        });
    }, []);

    useMessageEvent<TranslationLanguagesEvent>(TranslationLanguagesEvent, handleLanguagesEvent);
    useMessageEvent<TranslationResultEvent>(TranslationResultEvent, handleTranslationResult);

    const ensureSupportedLanguagesLoaded = useCallback((force: boolean = false) =>
    {
        if(languagesLoading) return;
        if(languagesLoaded && !force) return;

        setLanguagesLoading(true);
        setLastError('');
        clearLanguagesTimeout();

        languagesTimeoutRef.current = window.setTimeout(() =>
        {
            setLanguagesLoading(false);
            setLastError('Google Translate did not respond while loading languages.');
        }, REQUEST_TIMEOUT_MS);

        SendMessageComposer(new TranslationLanguagesRequestComposer(getBrowserLanguageCode()));
    }, [ clearLanguagesTimeout, languagesLoaded, languagesLoading ]);

    const translateText = useCallback((text: string, targetLanguage: string) =>
    {
        const safeText = (text || '');
        const normalizedTargetLanguage = normalizeLanguageCode(targetLanguage || defaultTargetLanguage) || defaultTargetLanguage;

        if(!safeText.trim().length)
        {
            return Promise.resolve({
                originalText: safeText,
                translatedText: safeText,
                detectedLanguage: '',
                targetLanguage: normalizedTargetLanguage
            });
        }

        const cacheKey = `${ normalizedTargetLanguage }\u0000${ safeText }`;
        const cachedValue = translationCacheRef.current.get(cacheKey);

        if(cachedValue) return Promise.resolve(cachedValue);

        return new Promise<IResolvedTranslation>((resolve, reject) =>
        {
            const requestId = ++requestIdRef.current;
            const timeoutId = window.setTimeout(() =>
            {
                pendingRequestsRef.current.delete(requestId);
                reject(new Error('Google Translate did not respond in time.'));
            }, REQUEST_TIMEOUT_MS);

            pendingRequestsRef.current.set(requestId, { resolve, reject, timeoutId });
            SendMessageComposer(new TranslationTextRequestComposer(requestId, safeText, normalizedTargetLanguage));
        }).then(result =>
        {
            translationCacheRef.current.set(cacheKey, result);

            return result;
        });
    }, [ defaultTargetLanguage ]);

    const translateIncoming = useCallback(async (text: string) =>
    {
        if(!settings.enabled) return null;

        try
        {
            const result = await translateText(text, settings.incomingTargetLanguage || defaultTargetLanguage);

            setLastIncomingLanguage(result.detectedLanguage || '');
            setLastError('');

            return result;
        }
        catch(error)
        {
            setLastError((error as Error)?.message || 'Unable to translate incoming text.');

            return null;
        }
    }, [ defaultTargetLanguage, settings.enabled, settings.incomingTargetLanguage, translateText ]);

    const translateOutgoing = useCallback(async (text: string) =>
    {
        if(!settings.enabled) return null;

        try
        {
            const result = await translateText(text, settings.outgoingTargetLanguage || defaultTargetLanguage);

            setLastOutgoingLanguage(result.detectedLanguage || '');
            setLastError('');

            return result;
        }
        catch(error)
        {
            setLastError((error as Error)?.message || 'Unable to translate outgoing text.');

            return null;
        }
    }, [ defaultTargetLanguage, settings.enabled, settings.outgoingTargetLanguage, translateText ]);

    const enqueueOutgoingTranslation = useCallback((translation: IResolvedTranslation) =>
    {
        if(!translation) return;

        pruneOutgoingQueue();

        const queueKey = translation.translatedText || translation.originalText;
        const currentEntries = outgoingQueueRef.current.get(queueKey) || [];

        currentEntries.push({
            ...translation,
            expiresAt: (Date.now() + OUTGOING_QUEUE_TTL_MS)
        });

        outgoingQueueRef.current.set(queueKey, currentEntries);
        setLastOutgoingLanguage(translation.detectedLanguage || '');
    }, [ pruneOutgoingQueue ]);

    const consumeOutgoingTranslation = useCallback((translatedText: string) =>
    {
        pruneOutgoingQueue();

        const queueKey = translatedText || '';
        const currentEntries = outgoingQueueRef.current.get(queueKey);

        if(!currentEntries?.length) return null;

        const entry = currentEntries.shift();

        if(currentEntries.length) outgoingQueueRef.current.set(queueKey, currentEntries);
        else outgoingQueueRef.current.delete(queueKey);

        if(entry?.detectedLanguage) setLastOutgoingLanguage(entry.detectedLanguage);

        return entry || null;
    }, [ pruneOutgoingQueue ]);

    useEffect(() =>
    {
        if(!settings.enabled) return;

        ensureSupportedLanguagesLoaded();
    }, [ ensureSupportedLanguagesLoaded, settings.enabled ]);

    useEffect(() =>
    {
        if(!supportedLanguages.length) return;

        const resolvedIncomingTargetLanguage = resolveSupportedLanguage(settings.incomingTargetLanguage || defaultTargetLanguage, supportedLanguages);
        const resolvedOutgoingTargetLanguage = resolveSupportedLanguage(settings.outgoingTargetLanguage || defaultTargetLanguage, supportedLanguages);

        if((resolvedIncomingTargetLanguage === settings.incomingTargetLanguage) && (resolvedOutgoingTargetLanguage === settings.outgoingTargetLanguage)) return;

        setSettings(prevValue => ({
            ...prevValue,
            incomingTargetLanguage: resolvedIncomingTargetLanguage,
            outgoingTargetLanguage: resolvedOutgoingTargetLanguage
        }));
    }, [ defaultTargetLanguage, setSettings, settings.incomingTargetLanguage, settings.outgoingTargetLanguage, supportedLanguages ]);

    useEffect(() =>
    {
        let disposed = false;
        const requestId = ++localizationRequestRef.current;
        const selectedLocale = resolveTextTranslationLocale(settings.uiTextLanguage || '');

        const applyLocalizationOverride = async () =>
        {
            if(!selectedLocale)
            {
                await applyTextTranslationLocale('');

                if((localizationRequestRef.current === requestId) && !disposed)
                {
                    setLocalizationTextsLoading(false);
                    setLastError('');
                }

                return;
            }

            if(!disposed) setLocalizationTextsLoading(true);

            try
            {
                if(disposed || (localizationRequestRef.current !== requestId)) return;

                await applyTextTranslationLocale(settings.uiTextLanguage || '');

                if(disposed || (localizationRequestRef.current !== requestId)) return;

                setLastError('');
            }
            catch(error)
            {
                if(disposed || (localizationRequestRef.current !== requestId)) return;

                await applyTextTranslationLocale('');
                setLastError((error as Error)?.message || 'Unable to load translated UI texts.');
            }
            finally
            {
                if(disposed || (localizationRequestRef.current !== requestId)) return;

                setLocalizationTextsLoading(false);
            }
        };

        applyLocalizationOverride();

        return () =>
        {
            disposed = true;
        };
    }, [ settings.uiTextLanguage ]);

    useEffect(() =>
    {
        return () =>
        {
            clearLanguagesTimeout();

            pendingRequestsRef.current.forEach(pendingRequest => window.clearTimeout(pendingRequest.timeoutId));
            pendingRequestsRef.current.clear();
            outgoingQueueRef.current.clear();
        };
    }, [ clearLanguagesTimeout ]);

    return {
        settings,
        supportedLanguages,
        availableTextLocales,
        languagesLoading,
        languagesLoaded,
        localizationTextsLoading,
        lastIncomingLanguage,
        lastOutgoingLanguage,
        lastError,
        updateSettings,
        ensureSupportedLanguagesLoaded,
        translateText,
        translateIncoming,
        translateOutgoing,
        enqueueOutgoingTranslation,
        consumeOutgoingTranslation,
        getLanguageName
    };
};

export const useTranslationState = () =>
{
    const {
        settings,
        supportedLanguages,
        availableTextLocales,
        languagesLoading,
        languagesLoaded,
        localizationTextsLoading,
        lastIncomingLanguage,
        lastOutgoingLanguage,
        lastError,
        getLanguageName
    } = useSharedHook(useTranslationStore);

    return {
        settings,
        supportedLanguages,
        availableTextLocales,
        languagesLoading,
        languagesLoaded,
        localizationTextsLoading,
        lastIncomingLanguage,
        lastOutgoingLanguage,
        lastError,
        getLanguageName
    };
};

export const useTranslationActions = () =>
{
    const {
        settings,
        updateSettings,
        ensureSupportedLanguagesLoaded,
        translateText,
        translateIncoming,
        translateOutgoing,
        enqueueOutgoingTranslation,
        consumeOutgoingTranslation
    } = useSharedHook(useTranslationStore);

    return {
        settings,
        updateSettings,
        ensureSupportedLanguagesLoaded,
        translateText,
        translateIncoming,
        translateOutgoing,
        enqueueOutgoingTranslation,
        consumeOutgoingTranslation
    };
};

export const useTranslation = () => useSharedHook(useTranslationStore);

registerSharedHook(useTranslationStore);
