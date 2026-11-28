import { FC, MouseEvent, PropsWithChildren, useState } from 'react';
import { LocalizeShortNumber, localizeWithFallback } from '../../../api';
import earningsIcon from '../../../assets/images/purse-swf/icons/1747_icon_earnings_png$5e39e03f65fbbb9a85bedd0d577dc12d307477063.png';
import earningsUnseenIcon from '../../../assets/images/purse-swf/icons/1784_unseen_indicator_png$d0b67597beeb8511b482f84737b145d2-1005700014.png';
import hcIcon from '../../../assets/images/purse-swf/icons/1801_hc_icon_png$2f8b554609e9c5cbbdc46bcbe5764be5-210881771.png';
import logoutIcon from '../../../assets/images/purse-swf/icons/1936_logout_icon_png$6a29fdff1e5e3cdd3c6290cec5c962b4-234470554.png';
import settingsIcon from '../../../assets/images/purse-swf/icons/2291_settings_icon_png$c9dcf215bb7a7e35a3f128c7c60151bc1008066621.png';
import creditsIcon from '../../../assets/images/purse/air/credits.png';
import diamondIcon from '../../../assets/images/purse/air/diamond.png';
import ducketsIcon from '../../../assets/images/purse/air/duckets.png';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useHandheldHudStore } from '../../../state/handheldHudStore';

/** The three balances the chip can show, in the order it shows them. */
const CHIP_CURRENCIES: Record<number, { icon: string; key: string; fallback: string }> = {
    [-1]: { icon: creditsIcon, key: 'purse_coins', fallback: 'Credits' },
    0: { icon: ducketsIcon, key: 'achievements.activitypoint.0', fallback: 'Duckets' },
    5: { icon: diamondIcon, key: 'achievements.activitypoint.5', fallback: 'Diamonds' }
};

/** A whole balance with a comma between the thousands, or the short form when the hotel asks for it. */
export const formatHandheldBalance = (amount: number, short: boolean): string => {
    if (!Number.isFinite(amount)) return '0';
    if (short) return LocalizeShortNumber(amount).toLowerCase();

    return Math.trunc(amount)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export interface HandheldPurseBalance {
    /** -1 credits, 0 duckets, 5 diamonds. */
    type: number;
    amount: number;
    onClick: () => void;
}

interface HandheldPurseAction {
    label: string;
    onClick: (event: MouseEvent) => void;
}

interface HandheldPurseViewProps {
    balances: readonly HandheldPurseBalance[];
    short: boolean;
    /** Null when the hotel has no club. */
    club: HandheldPurseAction | null;
    earnings: HandheldPurseAction & { unseen: boolean };
    help: HandheldPurseAction;
    logout: HandheldPurseAction;
    settingsLabel: string;
    settingsRows: readonly { link: string; label: string }[];
    onSettingsLink: (link: string) => void;
}

/**
 * The phone purse: a glass capsule with the balances in one row at the top right (each a coin and its number, a
 * hairline between them), and under it a small handle that
 * unfolds what the desktop purse shows all the time (club, earnings, help, settings, log out) together with the
 * right column's widgets (RightSideView reads the same flag). The promos and other currencies passed as children
 * stay mounted while folded, so what they listen for is not missed.
 */
export const HandheldPurseView: FC<PropsWithChildren<HandheldPurseViewProps>> = (props) => {
    const { balances, short, club, earnings, help, logout, settingsLabel, settingsRows, onSettingsLink, children = null } = props;
    const sideOpen = useHandheldHudStore((state) => state.sideOpen);
    const setSideOpen = useHandheldHudStore((state) => state.setSideOpen);
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <NativeTextTree>
            <div className="octane-handheld-purse" data-open={sideOpen ? 'true' : 'false'}>
                <div className="octane-handheld-purse__chip">
                    {balances.map((balance) => {
                        const currency = CHIP_CURRENCIES[balance.type];
                        const name = currency ? localizeWithFallback(currency.key, currency.fallback) : '';

                        return (
                            <BaseButton
                                key={balance.type}
                                type="button"
                                className="octane-handheld-purse__balance"
                                data-currency={balance.type}
                                aria-label={name ? `${name}: ${balance.amount}` : String(balance.amount)}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    balance.onClick();
                                }}
                            >
                                {currency && <img src={currency.icon} alt="" className="octane-handheld-purse__coin" />}
                                <span className="octane-handheld-purse__amount">{formatHandheldBalance(balance.amount, short)}</span>
                            </BaseButton>
                        );
                    })}
                </div>
                <BaseButton
                    type="button"
                    className="octane-handheld-purse__toggle"
                    aria-expanded={sideOpen}
                    aria-label={sideOpen ? localizeWithFallback('octane.handheld.hud.less', 'Show less') : localizeWithFallback('octane.handheld.hud.more', 'Show more')}
                    onClick={(event) => {
                        event.stopPropagation();
                        setSideOpen(!sideOpen);
                    }}
                >
                    <svg aria-hidden="true" viewBox="0 0 12 8">
                        <path d="M1.5 1.5 L6 6 L10.5 1.5" />
                    </svg>
                </BaseButton>
                {sideOpen && (
                    <div className="octane-handheld-purse__panel">
                        {club && (
                            <BaseButton type="button" className="octane-handheld-purse__action is-wide" data-action="club" onClick={club.onClick}>
                                <img src={hcIcon} alt="" />
                                <span>{club.label}</span>
                            </BaseButton>
                        )}
                        <BaseButton type="button" className="octane-handheld-purse__action is-wide" data-action="earnings" onClick={earnings.onClick}>
                            <img src={earningsIcon} alt="" />
                            <span>{earnings.label}</span>
                            {earnings.unseen && <img src={earningsUnseenIcon} alt="" className="octane-handheld-purse__unseen" />}
                        </BaseButton>
                        <BaseButton type="button" className="octane-handheld-purse__action" data-action="help" onClick={help.onClick}>
                            <span>{help.label}</span>
                        </BaseButton>
                        <BaseButton
                            type="button"
                            className="octane-handheld-purse__action"
                            data-action="settings"
                            aria-label={settingsLabel}
                            aria-expanded={settingsOpen}
                            onClick={(event) => {
                                event.stopPropagation();
                                setSettingsOpen((value) => !value);
                            }}
                        >
                            <img src={settingsIcon} alt="" />
                        </BaseButton>
                        <BaseButton type="button" className="octane-handheld-purse__action" data-action="logout" aria-label={logout.label} onClick={logout.onClick}>
                            <img src={logoutIcon} alt="" />
                        </BaseButton>
                        {settingsOpen && (
                            <div className="octane-handheld-purse__settings" role="menu">
                                {settingsRows.map((row) => (
                                    <BaseButton
                                        key={row.link}
                                        type="button"
                                        role="menuitem"
                                        className="octane-handheld-purse__settings-row"
                                        onClick={() => {
                                            setSettingsOpen(false);
                                            onSettingsLink(row.link);
                                        }}
                                    >
                                        {row.label}
                                    </BaseButton>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                <div className="octane-handheld-purse__more" hidden={!sideOpen}>
                    {children}
                </div>
            </div>
        </NativeTextTree>
    );
};
