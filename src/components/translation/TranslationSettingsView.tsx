import { AddLinkEventTracker, ILinkEventTracker, RemoveLinkEventTracker } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useTranslation } from '../../hooks';

export const TranslationSettingsView: FC<{}> = () => {
    const [isVisible, setIsVisible] = useState(false);
    const {
        settings,
        supportedLanguages = [],
        availableTextLocales = [],
        languagesLoading = false,
        localizationTextsLoading = false,
        lastIncomingLanguage = '',
        lastOutgoingLanguage = '',
        lastError = '',
        updateSettings,
        ensureSupportedLanguagesLoaded,
        getLanguageName
    } = useTranslation();

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
            eventUrlPrefix: 'translation-settings/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        ensureSupportedLanguagesLoaded();
    }, [ensureSupportedLanguagesLoaded, isVisible]);

    if (!isVisible) return null;

    return (
        <OctaneCardView
            className="translation-settings-window min-w-0 w-[min(360px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            uniqueKey="translation-settings"
        >
            <OctaneCardHeaderView headerText="Google Translate" onCloseClick={() => setIsVisible(false)} />
            <OctaneCardContentView className="flex flex-col gap-3 text-black">
                <div className="flex items-center gap-2">
                    <input
                        checked={settings.enabled}
                        className="form-check-input"
                        type="checkbox"
                        onChange={(event) => updateSettings({ enabled: event.target.checked })}
                    />
                    <Text>Enable automatic translation</Text>
                </div>
                <div className="rounded border border-black/10 bg-black/5 p-2 text-[11px] leading-4">
                    When enabled, chat bubbles always show two lines: <strong>original:</strong> and <strong>translate:</strong>.
                </div>
                <div className="flex flex-col gap-2">
                    <Text bold>Interface texts</Text>
                    <div className="flex flex-col gap-1">
                        <label className="flex flex-col gap-1 text-[12px]">
                            <span>Localized text pack</span>
                            <select
                                className="rounded border border-black/20 bg-white px-2 py-1"
                                disabled={localizationTextsLoading}
                                value={settings.uiTextLanguage || ''}
                                onChange={(event) => updateSettings({ uiTextLanguage: event.target.value })}
                            >
                                <option value="">Default (gamedata)</option>
                                {availableTextLocales.map((locale) => (
                                    <option key={locale.code} value={locale.code}>
                                        {locale.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <Text bold>Incoming messages</Text>
                    <div className="flex flex-col gap-1">
                        <Text>Detected language (auto): {getLanguageName(lastIncomingLanguage)}</Text>
                        <label className="flex flex-col gap-1 text-[12px]">
                            <span>Translate into</span>
                            <select
                                className="rounded border border-black/20 bg-white px-2 py-1"
                                disabled={languagesLoading || !supportedLanguages.length}
                                value={settings.incomingTargetLanguage}
                                onChange={(event) => updateSettings({ incomingTargetLanguage: event.target.value })}
                            >
                                {supportedLanguages.map((language) => (
                                    <option key={language.code} value={language.code}>
                                        {language.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
                <div className="flex flex-col gap-2">
                    <Text bold>Outgoing messages</Text>
                    <div className="flex flex-col gap-1">
                        <Text>Detected writing language (auto): {getLanguageName(lastOutgoingLanguage)}</Text>
                        <label className="flex flex-col gap-1 text-[12px]">
                            <span>Send text as</span>
                            <select
                                className="rounded border border-black/20 bg-white px-2 py-1"
                                disabled={languagesLoading || !supportedLanguages.length}
                                value={settings.outgoingTargetLanguage}
                                onChange={(event) => updateSettings({ outgoingTargetLanguage: event.target.value })}
                            >
                                {supportedLanguages.map((language) => (
                                    <option key={language.code} value={language.code}>
                                        {language.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-black/60">
                    <span>{languagesLoading ? 'Loading languages...' : `${supportedLanguages.length} languages available`}</span>
                    <button
                        className="rounded border border-black/15 bg-white px-2 py-1 text-[11px] text-black hover:bg-black/5"
                        type="button"
                        onClick={() => ensureSupportedLanguagesLoaded(true)}
                    >
                        Refresh
                    </button>
                </div>
                {localizationTextsLoading && (
                    <div className="rounded border border-blue-300 bg-blue-50 px-2 py-1 text-[11px] leading-4 text-blue-700">
                        Loading localized interface texts...
                    </div>
                )}
                {lastError.length > 0 && (
                    <div className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] leading-4 text-red-700">{lastError}</div>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
