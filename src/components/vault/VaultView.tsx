import {
    AddLinkEventTracker,
    ClaimAllEarningsRewardsComposer,
    ClaimEarningsRewardComposer,
    EarningsCenterEvent,
    EarningsClaimResultEvent,
    IEarningsEntry,
    IEarningsReward,
    ILinkEventTracker,
    RemoveLinkEventTracker,
    RequestEarningsCenterComposer
} from '@octane/renderer';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../api';
import imgAchievements from '../../assets/images/vault/achievements.png';
import imgBonusbag from '../../assets/images/vault/bonusbag.png';
import imgDailygift from '../../assets/images/vault/dailygift.png';
import imgDonations from '../../assets/images/vault/donations.png';
import imgGames from '../../assets/images/vault/games.png';
import imgGeneric from '../../assets/images/vault/generic.png';
import imgHcpayday from '../../assets/images/vault/hcpayday.png';
import imgLevel from '../../assets/images/vault/levelprogression.png';
import imgMarketplace from '../../assets/images/vault/marketplace.png';
import imgSurprise from '../../assets/images/vault/surprise.png';
import { LayoutCurrencyIcon, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../common';
import { useMessageEvent } from '../../hooks';

const localizeWithFallback = (key: string, fallback: string) => {
    const text = LocalizeText(key);
    return text && text !== key ? text : fallback;
};

interface EarningCategory {
    // Wire categoryKey — MUST match the emulator contract
    // (emulatore/docs/earnings-packet-contract.md).
    key: string;
    // Standard gamedata localization key (ExternalTexts). 'label' is only the
    // fallback shown when the key is missing in the active texts.
    textKey: string;
    label: string;
    img: string;
    // Placeholder currency icons used only before the server entry arrives.
    fallbackCurrencies: number[];
}

// Fixed display order + icons/labels. Amounts, claimable state and the actual
// reward currencies come from the server (EarningsCenterEvent); these rows are
// the always-visible skeleton so the window matches the Habbo reference even
// before data lands. 'games' and 'club_job' have no standard earnings.*.label
// key — they use a custom key (add it to your texts) and fall back to Italian.
const CATEGORIES: EarningCategory[] = [
    { key: 'daily_gift', textKey: 'earnings.dailygift.label', label: 'Regalo giornaliero', img: imgDailygift, fallbackCurrencies: [5] },
    { key: 'games', textKey: 'earnings.games.label', label: 'Giochi', img: imgGames, fallbackCurrencies: [0] },
    { key: 'achievements', textKey: 'earnings.achievements.label', label: 'Traguardi', img: imgAchievements, fallbackCurrencies: [5, 0] },
    { key: 'marketplace', textKey: 'earnings.marketplace.label', label: 'Mercatino', img: imgMarketplace, fallbackCurrencies: [0] },
    { key: 'hc_payday', textKey: 'earnings.hc.label', label: 'Bonus giorno di paga HC', img: imgHcpayday, fallbackCurrencies: [0] },
    { key: 'level_progress', textKey: 'earnings.levelprogression.label', label: 'Progressione Livello', img: imgLevel, fallbackCurrencies: [5, 0] },
    { key: 'donations', textKey: 'earnings.donations.label', label: 'Donazioni', img: imgDonations, fallbackCurrencies: [0] },
    { key: 'bonus_bag', textKey: 'earnings.bonusbag.label', label: 'Sacco Bonus', img: imgBonusbag, fallbackCurrencies: [0] },
    { key: 'mystery_boxes', textKey: 'earnings.surpriseboxes.label', label: 'Scatole Sorprese', img: imgSurprise, fallbackCurrencies: [5, 0] },
    { key: 'club_job', textKey: 'earnings.clubwork.label', label: 'Club e Lavoro', img: imgGeneric, fallbackCurrencies: [0] }
];

// Map a server reward type to a LayoutCurrencyIcon `type`. Returns null for
// rewards that aren't a currency (badge / item) — those show just the amount.
const rewardCurrencyType = (reward: IEarningsReward): number | string | null => {
    switch (reward.type) {
        case 'credits':
            return -1;
        case 'pixels':
            return 0;
        case 'points':
            return reward.pointsType;
        case 'hc_days':
            return 'hc';
        default:
            return null;
    }
};

export const VaultView: FC<{}> = (props) => {
    const [isVisible, setIsVisible] = useState(false);
    const [entries, setEntries] = useState<IEarningsEntry[]>([]);

    const entriesByKey = useMemo(() => {
        const map = new Map<string, IEarningsEntry>();
        for (const entry of entries) map.set(entry.categoryKey, entry);
        return map;
    }, [entries]);

    const anyClaimable = useMemo(() => entries.some((entry) => entry.enabled && entry.claimable), [entries]);

    useMessageEvent<EarningsCenterEvent>(
        EarningsCenterEvent,
        useCallback((event: EarningsCenterEvent) => {
            const parser = event.getParser();
            if (!parser) return;
            setEntries(parser.entries ?? []);
        }, [])
    );

    useMessageEvent<EarningsClaimResultEvent>(
        EarningsClaimResultEvent,
        useCallback((event: EarningsClaimResultEvent) => {
            const parser = event.getParser();
            if (!parser) return;

            setEntries((prev) => {
                const next = prev.slice();

                for (const result of parser.results) {
                    if (result.hasEntry && result.entry) {
                        const idx = next.findIndex((e) => e.categoryKey === result.entry.categoryKey);
                        if (idx >= 0) next[idx] = result.entry;
                        else next.push(result.entry);
                    } else if (result.success) {
                        // No refreshed entry but the claim worked — mark it spent.
                        const idx = next.findIndex((e) => e.categoryKey === result.categoryKey);
                        if (idx >= 0) next[idx] = { ...next[idx], claimable: false };
                    }
                }

                return next;
            });
        }, [])
    );

    useEffect(() => {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) => {
                const parts = url.split('/');

                if (parts.length < 3) return;
                if (parts[2] !== 'vault') return;

                switch (parts[1]) {
                    case 'open':
                        setIsVisible(true);
                        return;
                    case 'close':
                        setIsVisible(false);
                        return;
                    case 'toggle':
                        setIsVisible((prevValue) => !prevValue);
                        return;
                }
            },
            eventUrlPrefix: 'habboUI/'
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    // Ask the server for fresh earnings every time the window opens.
    useEffect(() => {
        if (!isVisible) return;
        SendMessageComposer(new RequestEarningsCenterComposer());
    }, [isVisible]);

    const claimOne = useCallback((categoryKey: string) => {
        SendMessageComposer(new ClaimEarningsRewardComposer(categoryKey));
    }, []);

    const claimAll = useCallback(() => {
        SendMessageComposer(new ClaimAllEarningsRewardsComposer());
    }, []);

    if (!isVisible) return null;

    return (
        <OctaneCardView
            className="octane-vault min-w-0 w-[min(430px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            uniqueKey="vault"
        >
            <OctaneCardHeaderView headerText={localizeWithFallback('earnings.title', 'Guadagni')} onCloseClick={() => setIsVisible(false)} />
            <OctaneCardContentView className="octane-vault-content flex flex-col gap-[3px] text-black">
                {CATEGORIES.map((category) => {
                    const entry = entriesByKey.get(category.key) ?? null;
                    const canClaim = !!entry && entry.enabled && entry.claimable;
                    const rewards = entry?.rewards ?? [];

                    return (
                        <div key={category.key} className="flex items-center gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[5px] border border-[#9aa0a8] bg-white px-1.5 py-1">
                                <span className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded border border-black/15 bg-white">
                                    <img src={category.img} alt="" className="max-h-[20px] max-w-[20px] object-contain [image-rendering:pixelated]" />
                                </span>
                                <Text bold className="truncate">
                                    {localizeWithFallback(category.textKey, category.label)}
                                </Text>
                            </div>
                            <div className="flex min-w-[92px] shrink-0 items-center justify-end gap-2.5">
                                {rewards.length > 0
                                    ? rewards.map((reward, index) => {
                                          const currencyType = rewardCurrencyType(reward);
                                          return (
                                              <span key={index} className="flex items-center gap-1">
                                                  {currencyType !== null && <LayoutCurrencyIcon type={currencyType} />}
                                                  <Text bold>{reward.amount}</Text>
                                              </span>
                                          );
                                      })
                                    : category.fallbackCurrencies.map((currency, index) => (
                                          <span key={index} className="flex items-center gap-1">
                                              <LayoutCurrencyIcon type={currency} />
                                              <Text bold>0</Text>
                                          </span>
                                      ))}
                            </div>
                            <button
                                type="button"
                                disabled={!canClaim}
                                onClick={canClaim ? () => claimOne(category.key) : undefined}
                                className={
                                    canClaim
                                        ? 'shrink-0 cursor-pointer rounded-[4px] border border-[#4f7a22] bg-[linear-gradient(180deg,#72b03a_0%,#5a8c2a_100%)] px-2.5 py-[3px] text-[0.72rem] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-105'
                                        : 'shrink-0 cursor-default rounded-[4px] border border-[#909090] bg-[linear-gradient(180deg,#f2f2f2_0%,#cdcdcd_100%)] px-2.5 py-[3px] text-[0.72rem] font-bold text-[#7c7c7c] shadow-[inset_0_1px_0_#ffffff]'
                                }
                            >
                                {localizeWithFallback('earnings.claim.button', 'Riscatta')}
                            </button>
                        </div>
                    );
                })}
                <div className="flex justify-center pt-1">
                    <button
                        type="button"
                        disabled={!anyClaimable}
                        onClick={anyClaimable ? claimAll : undefined}
                        className={
                            anyClaimable
                                ? 'cursor-pointer rounded-[4px] border border-[#4f7a22] bg-[linear-gradient(180deg,#72b03a_0%,#5a8c2a_100%)] px-7 py-1 text-[0.78rem] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.3)] hover:brightness-105'
                                : 'cursor-default rounded-[4px] border border-[#909090] bg-[linear-gradient(180deg,#f2f2f2_0%,#cdcdcd_100%)] px-7 py-1 text-[0.78rem] font-bold text-[#7c7c7c] shadow-[inset_0_1px_0_#ffffff]'
                        }
                    >
                        {localizeWithFallback('earnings.claim.all', 'Richiedili Tutti')}
                    </button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
