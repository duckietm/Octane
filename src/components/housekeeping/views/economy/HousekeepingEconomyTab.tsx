import { FC, useState } from 'react';
import { FaBullhorn, FaCrown, FaExclamationTriangle, FaGift, FaPiggyBank } from 'react-icons/fa';
import { LocalizeText } from '../../../../api';
import { Button, LayoutCurrencyIcon } from '../../../../common';
import { useHousekeeping, useHousekeepingConfirm } from '../../../../hooks';

const HOTEL_ALERT_CONFIRM_THRESHOLD = 200;

export const HousekeepingEconomyTab: FC = () => {
    const confirm = useHousekeepingConfirm();
    const { selectedUser, isActionPending, giveCredits, giveDuckets, giveDiamonds, grantItem, setHcSubscription, sendHotelAlert } = useHousekeeping();

    const [creditsAmount, setCreditsAmount] = useState<number>(1000);
    const [ducketsAmount, setDucketsAmount] = useState<number>(100);
    const [diamondsAmount, setDiamondsAmount] = useState<number>(10);
    const [itemId, setItemId] = useState<number>(0);
    const [itemQuantity, setItemQuantity] = useState<number>(1);
    const [hcDays, setHcDays] = useState<number>(31);
    const [alertText, setAlertText] = useState('');

    const disableUserActions = !selectedUser || isActionPending;
    const disableHotelActions = isActionPending;
    const trimmedAlert = alertText.trim();

    return (
        <div className="flex flex-col gap-2.5">
            {!selectedUser ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-2.5 text-xs text-amber-700">
                    <FaExclamationTriangle size={12} />
                    {LocalizeText('housekeeping.economy.select_user')}
                </div>
            ) : (
                <div className="rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-transparent px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider font-semibold opacity-60">
                        {LocalizeText('housekeeping.economy.target', ['username', 'id'], ['', ''])
                            .replace(/[a-z]+:\s*/i, '')
                            .trim() || 'Target'}
                    </div>
                    <div className="text-sm font-semibold tabular-nums">
                        {selectedUser.username} <span className="text-zinc-400 font-normal">#{selectedUser.id}</span>
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/40 px-2 py-1.5">
                    <LayoutCurrencyIcon type={-1} classNames={['shrink-0']} />
                    <input
                        type="number"
                        min={1}
                        className="w-24 px-1.5 py-0.5 rounded border border-amber-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-400"
                        value={creditsAmount}
                        onChange={(event) => setCreditsAmount(parseInt(event.target.value) || 0)}
                    />
                    <Button
                        variant="success"
                        disabled={disableUserActions}
                        className="grow ml-auto"
                        onClick={() => giveCredits(selectedUser.id, creditsAmount)}
                    >
                        <FaPiggyBank size={10} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.economy.give_credits')}</span>
                    </Button>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50/40 px-2 py-1.5">
                    <LayoutCurrencyIcon type={0} classNames={['shrink-0']} />
                    <input
                        type="number"
                        min={1}
                        className="w-24 px-1.5 py-0.5 rounded border border-orange-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-orange-400"
                        value={ducketsAmount}
                        onChange={(event) => setDucketsAmount(parseInt(event.target.value) || 0)}
                    />
                    <Button
                        variant="success"
                        disabled={disableUserActions}
                        className="grow ml-auto"
                        onClick={() => giveDuckets(selectedUser.id, ducketsAmount)}
                    >
                        <FaPiggyBank size={10} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.economy.give_duckets')}</span>
                    </Button>
                </div>
                <div className="flex items-center gap-1.5 rounded-md border border-sky-200 bg-sky-50/40 px-2 py-1.5">
                    <LayoutCurrencyIcon type={5} classNames={['shrink-0']} />
                    <input
                        type="number"
                        min={1}
                        className="w-24 px-1.5 py-0.5 rounded border border-sky-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-sky-400"
                        value={diamondsAmount}
                        onChange={(event) => setDiamondsAmount(parseInt(event.target.value) || 0)}
                    />
                    <Button
                        variant="success"
                        disabled={disableUserActions}
                        className="grow ml-auto"
                        onClick={() => giveDiamonds(selectedUser.id, diamondsAmount)}
                    >
                        <FaPiggyBank size={10} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.economy.give_diamonds')}</span>
                    </Button>
                </div>
            </div>
            <div className="flex flex-col gap-1.5 rounded-md border border-violet-200 bg-violet-50/40 p-2">
                <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60 flex items-center gap-1">
                    <FaGift size={8} className="text-violet-500" />
                    {LocalizeText('housekeeping.economy.grant_item.label')}
                </label>
                <div className="flex items-center gap-1.5">
                    <input
                        type="number"
                        min={1}
                        className="w-24 px-1.5 py-1 rounded border border-violet-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-black placeholder:italic"
                        placeholder={LocalizeText('housekeeping.economy.item_id')}
                        value={itemId || ''}
                        onChange={(event) => setItemId(parseInt(event.target.value) || 0)}
                    />
                    <input
                        type="number"
                        min={1}
                        className="w-16 px-1.5 py-1 rounded border border-violet-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-black placeholder:italic"
                        placeholder={LocalizeText('housekeeping.economy.item_quantity')}
                        value={itemQuantity}
                        onChange={(event) => setItemQuantity(parseInt(event.target.value) || 0)}
                    />
                    <Button
                        variant="primary"
                        disabled={disableUserActions || !itemId}
                        className="grow"
                        onClick={() => grantItem(selectedUser.id, itemId, itemQuantity)}
                    >
                        <FaGift size={10} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.economy.grant_item')}</span>
                    </Button>
                </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-2 py-1.5">
                <FaCrown size={13} className="text-amber-600 shrink-0" />
                <input
                    type="number"
                    min={0}
                    className="w-20 px-1.5 py-0.5 rounded border border-amber-200 bg-white text-xs tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-400"
                    value={hcDays}
                    onChange={(event) => setHcDays(parseInt(event.target.value) || 0)}
                />
                <span className="text-[11px] text-zinc-600">days</span>
                <Button variant="warning" disabled={disableUserActions} className="grow ml-auto" onClick={() => setHcSubscription(selectedUser.id, hcDays)}>
                    <FaCrown size={10} />
                    <span className="ml-1">{LocalizeText('housekeeping.economy.set_hc_days')}</span>
                </Button>
            </div>
            <div className="flex flex-col gap-1.5 rounded-md border border-rose-200 bg-rose-50/40 p-2">
                <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60 flex items-center gap-1">
                    <FaBullhorn size={9} className="text-rose-500" />
                    {LocalizeText('housekeeping.hotel.alert.label')}
                </label>
                <textarea
                    className="min-h-[60px] px-2 py-1 rounded text-sm border border-rose-200 bg-white focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:text-black placeholder:italic"
                    placeholder={LocalizeText('housekeeping.hotel.alert.placeholder')}
                    value={alertText}
                    onChange={(event) => setAlertText(event.target.value)}
                />
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 tabular-nums">{trimmedAlert.length} chars</span>
                    <Button
                        variant="danger"
                        disabled={disableHotelActions || !trimmedAlert.length}
                        onClick={() => {
                            const dispatch = () => sendHotelAlert(trimmedAlert);

                            if (trimmedAlert.length >= HOTEL_ALERT_CONFIRM_THRESHOLD) {
                                confirm(LocalizeText('housekeeping.hotel.alert.confirm', ['count'], [String(trimmedAlert.length)]), dispatch);

                                return;
                            }

                            dispatch();
                        }}
                    >
                        <FaBullhorn size={10} />
                        <span className="ml-1 text-white">{LocalizeText('housekeeping.hotel.alert.send')}</span>
                    </Button>
                </div>
            </div>
        </div>
    );
};
