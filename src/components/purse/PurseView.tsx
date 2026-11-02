import { CreateLinkEvent, DisconnectMessageComposer, GetCommunication } from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    clearAccessToken,
    ClearRememberLogin,
    FriendlyTime,
    GetConfigurationValue,
    GetOptionalConfigurationValue,
    GetRememberLogin,
    localizeWithFallback,
    OpenUrl,
    SendMessageComposer
} from '../../api';
import earningsIcon from '../../assets/images/purse-swf/icons/1747_icon_earnings_png$5e39e03f65fbbb9a85bedd0d577dc12d307477063.png';
import earningsUnseenIcon from '../../assets/images/purse-swf/icons/1784_unseen_indicator_png$d0b67597beeb8511b482f84737b145d2-1005700014.png';
import hcIcon from '../../assets/images/purse-swf/icons/1801_hc_icon_png$2f8b554609e9c5cbbdc46bcbe5764be5-210881771.png';
import logoutIcon from '../../assets/images/purse-swf/icons/1936_logout_icon_png$6a29fdff1e5e3cdd3c6290cec5c962b4-234470554.png';
import settingsIcon from '../../assets/images/purse-swf/icons/2291_settings_icon_png$c9dcf215bb7a7e35a3f128c7c60151bc1008066621.png';
import { Column } from '../../common';
import { ClearStoredChatHistory, usePurse } from '../../hooks';
import { useEarningsIndicatorStore } from '../../state/earningsIndicatorStore';
import { ClubExtendView } from './views/ClubExtendView';
import { ClubPromoView, isClubPromoVisible } from './views/ClubPromoView';
import { CurrencyView } from './views/CurrencyView';
import { SeasonalView } from './views/SeasonalView';
import { BaseButton } from '../../common/BaseButton';
import { Hint } from '../../common/Tooltip';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/** How long logout waits for the server before going on: the local credentials are already gone. */
const LOGOUT_TIMEOUT_MS = 3000;

export const PurseView: FC<{}> = (props) => {
    const { purse = null, hcDisabled = false } = usePurse();
    const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
    const earningsUnseen = useEarningsIndicatorStore((state) => state.showing);

    // AIR SettingsExtension: one row per settings window, each closing the menu.
    const openSettingsLink = useCallback((link: string) => {
        CreateLinkEvent(link);
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

    // AIR PurseClubArea: without club days the "join" label shows purse.clubdays.zero.amount.text.
    const joinLabel = useMemo(() => localizeWithFallback('purse.clubdays.zero.amount.text', 'Get'), []);

    // With HC, the time left: minutes under a day, else (periods x 31 + days) days.
    const clubLabel = useMemo(() => {
        if (!purse || purse.clubDays <= 0) return joinLabel;
        if (purse.minutesUntilExpiration > -1 && purse.minutesUntilExpiration < 60 * 24) {
            return FriendlyTime.shortFormat(purse.minutesUntilExpiration * 60);
        }
        return FriendlyTime.shortFormat((purse.clubPeriods * 31 + purse.clubDays) * 86400);
    }, [purse, joinLabel]);

    const earningsLabel = useMemo(() => localizeWithFallback('earnings.title', 'Earnings'), []);
    const helpLabel = useMemo(() => localizeWithFallback('toolbar.help', 'Help'), []);
    const logoutLabel = useMemo(() => localizeWithFallback('toolbar.logout', 'Log out'), []);
    const settingsLabel = useMemo(() => localizeWithFallback('widget.memenu.settings', 'Settings'), []);
    const clubTooltip = useMemo(() => localizeWithFallback('catalog.club.hc', 'Habbo Club'), []);

    // AIR PurseClubArea.onClubChanged: when the club days change while a member, the HC button drops and bounces.
    const clubDayCount = purse ? purse.clubPeriods * 31 + purse.clubDays : -1;
    const previousClubDays = useRef(-1);
    const [clubBouncing, setClubBouncing] = useState(false);

    useEffect(() => {
        if (clubDayCount < 0) return;

        const previous = previousClubDays.current;

        previousClubDays.current = clubDayCount;

        if (previous === -1 || previous === clubDayCount || !purse?.clubLevel) return;

        setClubBouncing(true);

        const timeout = window.setTimeout(() => setClubBouncing(false), 900);

        return () => window.clearTimeout(timeout);
    }, [clubDayCount, purse?.clubLevel]);

    // AIR PurseAreaExtension.windowProcedure: credits open the web shop, duckets and diamonds their catalog page.
    const openCredits = useCallback(() => {
        const shopUrl = GetConfigurationValue<string>('web.shop.relativeUrl', '');

        if (shopUrl) OpenUrl(shopUrl);
    }, []);

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

        // The local credentials go first: the server call below can hang, and on a shared computer the next user
        // reloading the page must not find this account still remembered.
        ClearRememberLogin();
        clearAccessToken();
        ClearStoredChatHistory();
        if (window.OctaneConfig) window.OctaneConfig['sso.ticket'] = '';

        try {
            await fetch(logoutUrl, {
                method: 'POST',
                credentials: 'include',
                keepalive: true,
                signal: AbortSignal.timeout(LOGOUT_TIMEOUT_MS),
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

    // AIR SettingsExtension rows: sound, Discord (discord.enabled), chat, other, word filter (user.custom.filter.enabled).
    const settingsMenuRows = [
        { link: 'user-settings/show/audio', label: localizeWithFallback('widget.memenu.settings.audio', 'Sound settings') },
        GetOptionalConfigurationValue<boolean>('discord.enabled', false)
            ? { link: 'discord-settings/show', label: localizeWithFallback('widget.memenu.settings.discord', 'Discord settings') }
            : null,
        { link: 'user-settings/show/chat', label: localizeWithFallback('widget.memenu.settings.chat', 'Chat settings') },
        { link: 'user-settings/show/other', label: localizeWithFallback('widget.memenu.settings.other', 'Other settings') },
        GetOptionalConfigurationValue<boolean>('user.custom.filter.enabled', true)
            ? { link: 'user-settings/show/wordfilter', label: localizeWithFallback('word_filter.settings.title', 'Word filter') }
            : null
    ].filter(Boolean);

    // AIR ClubDiscountPromoExtension: the renewal offer while the membership runs out.
    const showClubPromo = isClubPromoVisible(purse, hcDisabled);

    return (
        <NativeTextTree>
            <Column alignItems="end" className="octane-purse-container" gap={0}>
                <div className="octane-purse">
                    <div className="octane-purse__chrome" aria-hidden="true" />
                    <div className="octane-purse__body">
                        <div className="octane-purse__currencies">
                            {hasDiamonds && (
                                <CurrencyView
                                    type={5}
                                    amount={purse.activityPoints.get(5) || 0}
                                    short={currencyDisplayNumberShort}
                                    onClick={() => CreateLinkEvent('catalog/open/loyalty_info')}
                                />
                            )}
                            <CurrencyView type={-1} amount={purse.credits} short={currencyDisplayNumberShort} onClick={openCredits} />
                            {hasDuckets && (
                                <CurrencyView
                                    type={0}
                                    amount={purse.activityPoints.get(0) || 0}
                                    short={currencyDisplayNumberShort}
                                    onClick={() => CreateLinkEvent('catalog/open/ducket_info')}
                                />
                            )}
                        </div>
                        <div className="octane-purse__col octane-purse__col--primary subscription-container">
                            {!hcDisabled && (
                                <Hint content={clubTooltip}>
                                    <BaseButton
                                        type="button"
                                        className={`octane-purse__btn octane-purse__btn--join octane-purse-subscription club-text${clubBouncing ? ' is-bouncing' : ''}`}
                                        onClick={openClub}
                                    >
                                        <img src={hcIcon} alt="" className="octane-purse__btn-img" />
                                        <span>{clubLabel}</span>
                                    </BaseButton>
                                </Hint>
                            )}
                            <Hint content={earningsLabel}>
                                <BaseButton
                                    type="button"
                                    className="octane-purse__btn octane-purse__btn--earnings octane-purse-subscription club-text"
                                    onClick={openEarnings}
                                >
                                    <img src={earningsIcon} alt="" className="octane-purse__btn-img" />
                                    <span>{earningsLabel}</span>
                                    {earningsUnseen && <img src={earningsUnseenIcon} alt="" className="octane-purse__earnings-unseen" />}
                                </BaseButton>
                            </Hint>
                        </div>
                        <div className="octane-purse__divider" aria-hidden="true" />
                        <div className="octane-purse__col octane-purse__col--actions">
                            <Hint content={helpLabel}>
                                <BaseButton
                                    type="button"
                                    className="octane-purse__btn octane-purse__btn--help octane-purse-right-button help"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        CreateLinkEvent('help/show');
                                    }}
                                >
                                    <span>{helpLabel}</span>
                                </BaseButton>
                            </Hint>
                            <Hint content={logoutLabel}>
                                <BaseButton
                                    aria-label={logoutLabel}
                                    type="button"
                                    className="octane-purse__btn octane-purse__btn--icon octane-purse__btn--logout octane-purse-right-button disconnect"
                                    onClick={handleLogout}
                                >
                                    <img src={logoutIcon} alt="" className="octane-purse__btn-img" />
                                </BaseButton>
                            </Hint>
                            <Hint content={settingsLabel}>
                                <BaseButton
                                    aria-label={settingsLabel}
                                    aria-expanded={settingsMenuOpen}
                                    type="button"
                                    className="octane-purse__btn octane-purse__btn--icon octane-purse__btn--settings octane-purse-right-button settings"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        setSettingsMenuOpen((value) => !value);
                                    }}
                                >
                                    <img src={settingsIcon} alt="" className="octane-purse__btn-img" />
                                </BaseButton>
                            </Hint>
                        </div>
                    </div>
                </div>
                {showClubPromo && <ClubPromoView purse={purse} />}
                <ClubExtendView />
                {settingsMenuOpen && (
                    <div className="octane-purse-menu" role="menu">
                        {settingsMenuRows.map((row) => (
                            <BaseButton
                                key={row.link}
                                type="button"
                                role="menuitem"
                                className="octane-purse-menu__item"
                                onClick={() => openSettingsLink(row.link)}
                            >
                                {row.label}
                            </BaseButton>
                        ))}
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
        </NativeTextTree>
    );
};
