import { CreateLinkEvent, DisconnectMessageComposer, GetCommunication } from '@octane/renderer';
import { FC, useCallback, useMemo, useState } from 'react';
import { ClearRememberLogin, FriendlyTime, GetConfigurationValue, GetRememberLogin, LocalizeText, localizeWithFallback, SendMessageComposer } from '../../api';
import earningsIcon from '../../assets/images/purse-swf/icons/1747_icon_earnings_png$5e39e03f65fbbb9a85bedd0d577dc12d307477063.png';
import hcIcon from '../../assets/images/purse-swf/icons/1801_hc_icon_png$2f8b554609e9c5cbbdc46bcbe5764be5-210881771.png';
import logoutIcon from '../../assets/images/purse-swf/icons/1936_logout_icon_png$6a29fdff1e5e3cdd3c6290cec5c962b4-234470554.png';
import settingsIcon from '../../assets/images/purse-swf/icons/2291_settings_icon_png$c9dcf215bb7a7e35a3f128c7c60151bc1008066621.png';
import { Column } from '../../common';
import { ClearStoredChatHistory, usePurse } from '../../hooks';
import { CurrencyView } from './views/CurrencyView';
import { SeasonalView } from './views/SeasonalView';

export const PurseView: FC<{}> = (props) => {
    const { purse = null, hcDisabled = false } = usePurse();
    const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

    const openSettingsSection = useCallback((section: string) => {
        CreateLinkEvent('user-settings/show/' + section);
        setSettingsMenuOpen(false);
    }, []);

    const displayedCurrencies = useMemo(() => GetConfigurationValue<number[]>('system.currency.types', []), []);
    const currencyDisplayNumberShort = useMemo(() => GetConfigurationValue<boolean>('currency.display.number.short', false), []);

    const currencyTypes = useMemo(() => {
        if (!purse || !purse.activityPoints || !purse.activityPoints.size) return [];

        const types = Array.from(purse.activityPoints.keys()).filter((type) => displayedCurrencies.indexOf(type) >= 0);
        types.sort((a, b) => {
            if (a === 0) return -1;
            if (b === 0) return 1;
            if (a === 5) return -1;
            if (b === 5) return 1;
            return a - b;
        });

        return types;
    }, [displayedCurrencies, purse]);

    const hasDiamonds = currencyTypes.indexOf(5) >= 0;
    const hasDuckets = currencyTypes.indexOf(0) >= 0;
    const otherCurrencies = currencyTypes.filter((type) => type !== 0 && type !== 5);

    const joinLabel = useMemo(() => localizeWithFallback('purse.join', 'Join'), []);

    // When the user has active HC, show the remaining time instead of "Join"
    // (same formula as the HC Center's getClubText).
    const clubLabel = useMemo(() => {
        if (!purse || purse.clubDays <= 0) return joinLabel;
        if (purse.minutesUntilExpiration > -1 && purse.minutesUntilExpiration < 60 * 24) {
            return FriendlyTime.shortFormat(purse.minutesUntilExpiration * 60);
        }
        return FriendlyTime.shortFormat((purse.clubPeriods * 31 + purse.clubDays) * 86400);
    }, [purse, joinLabel]);

    const earningsLabel = useMemo(() => localizeWithFallback('earnings.title', 'Earnings'), []);
    const helpLabel = useMemo(() => localizeWithFallback('help.button.name', 'Help'), []);
    const translateLabel = useMemo(() => localizeWithFallback('purse.settings.translate', 'Translate'), []);

    const openClub = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        CreateLinkEvent('habboUI/open/hccenter');
    }, []);

    const openEarnings = useCallback((event: React.MouseEvent) => {
        event.stopPropagation();
        CreateLinkEvent('habboUI/open/vault');
    }, []);

    const handleLogout = useCallback(async (event: React.MouseEvent) => {
        event.stopPropagation();

        const logoutUrl = GetConfigurationValue<string>('login.logout.endpoint', '/api/auth/logout');
        const ssoTicket = (window.OctaneConfig?.['sso.ticket'] as string) ?? '';
        const rememberToken = GetRememberLogin()?.token || '';

        try {
            SendMessageComposer(new DisconnectMessageComposer());
            await new Promise((resolve) => setTimeout(resolve, 100));
        } catch {
            /* best-effort — the HTTP logout below still performs server cleanup */
        }

        try {
            await fetch(logoutUrl, {
                method: 'POST',
                credentials: 'include',
                keepalive: true,
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'OctanePurseLogout'
                },
                body: JSON.stringify({ ssoTicket, rememberToken })
            });
        } catch {
            /* best-effort — proceed with local logout regardless */
        }

        try {
            GetCommunication().connection.dispose();
        } catch {
            /* best-effort — page reload will drop the transport if it is already closed */
        }

        ClearRememberLogin();
        ClearStoredChatHistory();
        if (window.OctaneConfig) window.OctaneConfig['sso.ticket'] = '';

        // When the client runs inside a CMS page, reloading the iframe alone
        // leaves the user logged in on the site with a dead client. Send the
        // whole window to the CMS logout instead, so both sessions end together.
        const cmsLogoutUrl = GetConfigurationValue<string>('logout.redirect.url', '');

        if (cmsLogoutUrl) {
            try {
                (window.top ?? window).location.href = cmsLogoutUrl;
                return;
            } catch {
                /* blocked by the browser — fall through to the local reload */
            }
        }

        window.location.reload();
    }, []);

    if (!purse) return null;

    return (
        <Column alignItems="end" className="octane-purse-container" gap={0}>
            <div className="octane-purse">
                <div className="octane-purse__chrome" aria-hidden="true" />
                <div className="octane-purse__body">
                    <div className="octane-purse__currencies">
                        {hasDiamonds && <CurrencyView type={5} amount={purse.activityPoints.get(5) || 0} short={currencyDisplayNumberShort} />}
                        <CurrencyView type={-1} amount={purse.credits} short={currencyDisplayNumberShort} />
                        {hasDuckets && <CurrencyView type={0} amount={purse.activityPoints.get(0) || 0} short={currencyDisplayNumberShort} />}
                    </div>
                    <div className="octane-purse__col octane-purse__col--primary subscription-container">
                        {!hcDisabled && (
                            <button
                                type="button"
                                className="octane-purse__btn octane-purse__btn--join octane-purse-subscription club-text"
                                onClick={openClub}
                                title={clubLabel}
                            >
                                <img src={hcIcon} alt="" className="octane-purse__btn-img" />
                                <span>{clubLabel}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            className="octane-purse__btn octane-purse__btn--earnings octane-purse-subscription club-text"
                            onClick={openEarnings}
                            title={earningsLabel}
                        >
                            <img src={earningsIcon} alt="" className="octane-purse__btn-img" />
                            <span>{earningsLabel}</span>
                        </button>
                    </div>
                    <div className="octane-purse__divider" aria-hidden="true" />
                    <div className="octane-purse__col octane-purse__col--actions">
                        <button
                            type="button"
                            className="octane-purse__btn octane-purse__btn--help octane-purse-right-button help"
                            onClick={(event) => {
                                event.stopPropagation();
                                CreateLinkEvent('help/show');
                            }}
                            title={helpLabel}
                        >
                            <span>{helpLabel}</span>
                        </button>
                        <button
                            type="button"
                            className="octane-purse__btn octane-purse__btn--icon octane-purse__btn--logout octane-purse-right-button disconnect"
                            onClick={handleLogout}
                            title="Log out"
                        >
                            <img src={logoutIcon} alt="" className="octane-purse__btn-img" />
                        </button>
                        <button
                            type="button"
                            className="octane-purse__btn octane-purse__btn--icon octane-purse__btn--settings octane-purse-right-button settings"
                            onClick={(event) => {
                                event.stopPropagation();
                                setSettingsMenuOpen((value) => !value);
                            }}
                            title={LocalizeText('widget.memenu.settings.title')}
                        >
                            <img src={settingsIcon} alt="" className="octane-purse__btn-img" />
                        </button>
                    </div>
                </div>
            </div>
            {settingsMenuOpen && (
                <div className="octane-purse-menu">
                    <button type="button" className="octane-purse-menu__item" onClick={() => openSettingsSection('')}>
                        {localizeWithFallback('widget.memenu.settings.title', 'Settings')}
                    </button>
                    <button type="button" className="octane-purse-menu__item" onClick={() => openSettingsSection('privacy')}>
                        {localizeWithFallback('purse.settings.game_privacy', 'Game Privacy')}
                    </button>
                    <button
                        type="button"
                        className="octane-purse-menu__item"
                        onClick={() => {
                            CreateLinkEvent('translation-settings/toggle');
                            setSettingsMenuOpen(false);
                        }}
                    >
                        {translateLabel}
                    </button>
                    <button
                        type="button"
                        className="octane-purse-menu__item"
                        onClick={() => {
                            CreateLinkEvent('user-account-settings/show');
                            setSettingsMenuOpen(false);
                        }}
                    >
                        {localizeWithFallback('purse.settings.account', 'Account Management')}
                    </button>
                    <button type="button" className="octane-purse-menu__item octane-purse-menu__item--disabled" disabled>
                        {localizeWithFallback('purse.settings.wordfilter', 'Word Filter')}
                    </button>
                </div>
            )}
            {otherCurrencies.length > 0 && (
                <div className="octane-purse__other">
                    {otherCurrencies.map((type) => (
                        <SeasonalView key={type} type={type} amount={purse.activityPoints.get(type) || 0} />
                    ))}
                </div>
            )}
        </Column>
    );
};
