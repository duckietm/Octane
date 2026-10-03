import { FC, useState } from 'react';
import { FaCrown, FaGift, FaPiggyBank } from 'react-icons/fa';
import { IHousekeepingUser, LocalizeText } from '../../../../api';
import { LayoutCurrencyIcon } from '../../../../common';
import { useHousekeeping } from '../../../../hooks';
import { HousekeepingButton, HousekeepingNumberField, HousekeepingSection } from '../common/HousekeepingParts';

/** Currency, item and HC grants for the selected user. */
export const HousekeepingUserEconomyView: FC<{ user: IHousekeepingUser }> = ({ user }) => {
    const { isActionPending, giveCredits, giveDuckets, giveDiamonds, grantItem, setHcSubscription } = useHousekeeping();
    const [credits, setCredits] = useState(1000);
    const [duckets, setDuckets] = useState(100);
    const [diamonds, setDiamonds] = useState(10);
    const [itemId, setItemId] = useState(0);
    const [itemQuantity, setItemQuantity] = useState(1);
    const [hcDays, setHcDays] = useState(31);

    const currencies = [
        { type: -1, value: credits, set: setCredits, give: () => giveCredits(user.id, credits), key: 'housekeeping.economy.give_credits' },
        { type: 0, value: duckets, set: setDuckets, give: () => giveDuckets(user.id, duckets), key: 'housekeeping.economy.give_duckets' },
        { type: 5, value: diamonds, set: setDiamonds, give: () => giveDiamonds(user.id, diamonds), key: 'housekeeping.economy.give_diamonds' }
    ];

    return (
        <div className="flex flex-col gap-2">
            <HousekeepingSection
                icon={<FaPiggyBank className="text-amber-500" size={9} />}
                title={LocalizeText('housekeeping.economy.currencies')}
                tone="warning"
            >
                <div className="grid grid-cols-3 gap-2">
                    {currencies.map((currency) => (
                        <div key={currency.type} className="flex min-w-0 items-center gap-1">
                            <LayoutCurrencyIcon classNames={['shrink-0']} type={currency.type} />
                            <HousekeepingNumberField value={currency.value} widthClass="w-16" onChange={currency.set} />
                            <HousekeepingButton
                                classNames={['grow', 'min-w-0']}
                                disabled={isActionPending}
                                size="sm"
                                title={LocalizeText(currency.key)}
                                variant="success"
                                onClick={currency.give}
                            >
                                <FaPiggyBank size={9} />
                                <span className="truncate">{LocalizeText('housekeeping.economy.give')}</span>
                            </HousekeepingButton>
                        </div>
                    ))}
                </div>
            </HousekeepingSection>
            <div className="grid grid-cols-2 gap-2">
                <HousekeepingSection
                    icon={<FaGift className="text-violet-500" size={9} />}
                    title={LocalizeText('housekeeping.economy.grant_item.label')}
                    tone="accent"
                >
                    <div className="flex items-center gap-1.5">
                        <HousekeepingNumberField label={LocalizeText('housekeeping.economy.item_id')} value={itemId} widthClass="w-20" onChange={setItemId} />
                        <HousekeepingNumberField label="×" value={itemQuantity} widthClass="w-12" onChange={setItemQuantity} />
                    </div>
                    <HousekeepingButton
                        disabled={isActionPending || !itemId}
                        gap={1}
                        variant="primary"
                        onClick={() => grantItem(user.id, itemId, itemQuantity)}
                    >
                        <FaGift size={10} />
                        <span>{LocalizeText('housekeeping.economy.grant_item')}</span>
                    </HousekeepingButton>
                </HousekeepingSection>
                <HousekeepingSection
                    icon={<FaCrown className="text-amber-600" size={9} />}
                    title={LocalizeText('housekeeping.economy.hc.label')}
                    tone="warning"
                >
                    <HousekeepingNumberField min={0} unit={LocalizeText('housekeeping.unit.days')} value={hcDays} widthClass="w-20" onChange={setHcDays} />
                    <HousekeepingButton disabled={isActionPending} gap={1} variant="warning" onClick={() => setHcSubscription(user.id, hcDays)}>
                        <FaCrown size={10} />
                        <span>{LocalizeText('housekeeping.economy.set_hc_days')}</span>
                    </HousekeepingButton>
                </HousekeepingSection>
            </div>
        </div>
    );
};
