import { FC, useEffect, useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Button, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';
import { Select } from '../../../../common/Select';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';

type RewardType = 'badge' | 'credits' | 'pixels' | 'diamonds' | 'points' | 'furni' | 'respect';

export interface RewardEntry {
    rewardType: RewardType;
    rewardValue: string;
    probability: number;
    pointsType: number;
}

const DEFAULT_PROBABILITY = 100;
const DEFAULT_POINTS_TYPE = 5;
/** Official GiveReward: at most 20 rewards, codes of at most 100 characters. */
const MAX_REWARDS = 20;
const MAX_CODE_LENGTH = 100;
const MIN_PRIZE_LIMIT = 1;
const MAX_PRIZE_LIMIT = 1000;

// Official: hard-coded English options, 2 per row.
const REWARD_INTERVALS: { value: number; label: string }[] = [
    { value: 0, label: 'Once' },
    { value: 1, label: '1 / n Days' },
    { value: 2, label: '1 / n Hours' },
    { value: 3, label: '1 / n Mins' }
];

const clampPrizeLimit = (value: number) => (Number.isFinite(value) ? Math.max(MIN_PRIZE_LIMIT, Math.min(MAX_PRIZE_LIMIT, Math.floor(value))) : MIN_PRIZE_LIMIT);

const REWARD_TYPES: { value: RewardType; key: string; label: string }[] = [
    { value: 'badge', key: 'wiredfurni.params.reward.type.badge', label: 'Badge' },
    { value: 'credits', key: 'wiredfurni.params.reward.type.credits', label: 'Credits' },
    { value: 'pixels', key: 'wiredfurni.params.reward.type.pixels', label: 'Pixels / Duckets' },
    { value: 'diamonds', key: 'wiredfurni.params.reward.type.diamonds', label: 'Diamonds' },
    { value: 'points', key: 'wiredfurni.params.reward.type.points', label: 'Extra Currency' },
    { value: 'furni', key: 'wiredfurni.params.reward.type.furni', label: 'Furni' },
    { value: 'respect', key: 'wiredfurni.params.reward.type.respect', label: 'Respect' }
];

const SELECTABLE_REWARD_TYPES = REWARD_TYPES.filter((entry) => entry.value !== 'respect');

const createReward = (): RewardEntry => ({
    rewardType: 'furni',
    rewardValue: '',
    probability: DEFAULT_PROBABILITY,
    pointsType: DEFAULT_POINTS_TYPE
});

const getRewardValuePlaceholder = (rewardType: RewardType) => {
    switch (rewardType) {
        case 'badge':
            return 'Badge code';
        case 'credits':
            return 'Credits amount';
        case 'pixels':
            return 'Pixels amount';
        case 'diamonds':
            return 'Diamonds amount';
        case 'points':
            return 'Amount';
        case 'furni':
            return 'Furni base item id';
        case 'respect':
            return 'Respect amount';
    }
};

const getExtraFieldLabel = (rewardType: RewardType) => {
    switch (rewardType) {
        case 'points':
            return 'Currency Type';
        case 'badge':
            return 'Code';
        default:
            return 'Info';
    }
};

const getExtraFieldPlaceholder = (rewardType: RewardType) => {
    switch (rewardType) {
        case 'points':
            return 'Type id (e.g. 105)';
        case 'badge':
            return 'Badge';
        default:
            return '';
    }
};

const parseRewardEntry = (rawType: string, rawCode: string, rawProbability: string): RewardEntry => {
    const probability = Number(rawProbability);
    const parsedProbability = Number.isFinite(probability) ? probability : DEFAULT_PROBABILITY;

    if (rawType === '0') {
        return { rewardType: 'badge', rewardValue: rawCode, probability: parsedProbability, pointsType: DEFAULT_POINTS_TYPE };
    }

    const separatorIndex = rawCode.indexOf('#');

    if (separatorIndex === -1) {
        return { rewardType: 'furni', rewardValue: rawCode, probability: parsedProbability, pointsType: DEFAULT_POINTS_TYPE };
    }

    const rewardType = rawCode.slice(0, separatorIndex);
    const rewardValue = rawCode.slice(separatorIndex + 1);

    if (rewardType.startsWith('points')) {
        const pointsType = Number(rewardType.slice('points'.length));

        return {
            rewardType: 'points',
            rewardValue,
            probability: parsedProbability,
            pointsType: Number.isFinite(pointsType) ? pointsType : DEFAULT_POINTS_TYPE
        };
    }

    if (REWARD_TYPES.some((entry) => entry.value === rewardType)) {
        return { rewardType: rewardType as RewardType, rewardValue, probability: parsedProbability, pointsType: DEFAULT_POINTS_TYPE };
    }

    if (rewardType === 'cata') {
        return { rewardType: 'furni', rewardValue, probability: parsedProbability, pointsType: DEFAULT_POINTS_TYPE };
    }

    return { rewardType: 'furni', rewardValue: rawCode, probability: parsedProbability, pointsType: DEFAULT_POINTS_TYPE };
};

const encodeRewardCode = (reward: RewardEntry, rewardValue: string) => {
    if (reward.rewardType === 'badge') return rewardValue;
    if (reward.rewardType === 'points') return `points${Math.max(0, reward.pointsType)}#${rewardValue}`;

    return `${reward.rewardType}#${rewardValue}`;
};

/** The official GiveReward validation, on our typed rows: null when the rewards can be saved. */
export const validateRewards = (rewards: RewardEntry[], unique: boolean): string | null => {
    let sum = 0;

    for (const reward of rewards) {
        const rewardValue = reward.rewardValue.trim();

        if (!rewardValue) continue;

        if (rewardValue.includes(',')) return "Product/badge codes must not contain ',' characters.";
        if (rewardValue.includes(';')) return "Product/badge codes must not contain ';' characters.";
        if (encodeRewardCode(reward, rewardValue).length > MAX_CODE_LENGTH) return `Product/badge codes cannot contain more than ${MAX_CODE_LENGTH} characters.`;

        if (unique) continue;

        if (!Number.isFinite(reward.probability)) return 'Make sure are probabilities are numbers.';
        if (reward.probability < 1 || reward.probability > 100) return 'Make sure all probabilities are numbers between 1 and 100.';

        sum += Math.floor(reward.probability);
    }

    return sum > 100 ? `The sum of probabilities cannot exceed 100. You now have ${sum}.` : null;
};

export const WiredActionGiveRewardView: FC<{}> = (props) => {
    const [limitEnabled, setLimitEnabled] = useState(false);
    const [rewardTime, setRewardTime] = useState(1);
    const [uniqueRewards, setUniqueRewards] = useState(false);
    const [rewardsLimit, setRewardsLimit] = useState(1);
    const [limitationInterval, setLimitationInterval] = useState('1');
    const [error, setError] = useState<string | null>(null);
    const [rewards, setRewards] = useState<RewardEntry[]>([]);
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => slotUserSource(trigger));

    const addReward = () => setRewards((rewards) => (rewards.length >= MAX_REWARDS ? rewards : [...rewards, createReward()]));
    const hasCustomCurrencyReward = rewards.some((reward) => reward.rewardType === 'points');

    const removeReward = (index: number) => {
        setRewards((prevValue) => {
            const newValues = Array.from(prevValue);

            newValues.splice(index, 1);

            return newValues;
        });
    };

    const updateReward = (index: number, updater: (reward: RewardEntry) => RewardEntry) => {
        setRewards((prevValue) => prevValue.map((reward, rewardIndex) => (rewardIndex === index ? updater(reward) : reward)));
    };

    const validate = () => {
        const nextError = validateRewards(rewards, uniqueRewards);

        setError(nextError);

        return !nextError;
    };

    const save = () => {
        const stringRewards: string[] = [];

        for (const reward of rewards) {
            const rewardValue = reward.rewardValue.trim();

            if (!rewardValue) continue;

            const probability = Number.isFinite(reward.probability) ? Math.floor(reward.probability) : 0;
            const rewardsString = [reward.rewardType === 'badge' ? '0' : '1', encodeRewardCode(reward, rewardValue), (uniqueRewards ? DEFAULT_PROBABILITY : probability).toString()];

            stringRewards.push(rewardsString.join(','));
        }

        const interval = parseInt(limitationInterval, 10);

        // Official: always saved, also without rewards. Layout [interval, unique, limit (0 when not
        // set), n (at least 1)]; the user source is the official source slot.
        setStringParam(stringRewards.join(';'));
        setIntParams([rewardTime, uniqueRewards ? 1 : 0, limitEnabled ? rewardsLimit : 0, interval >= 1 ? interval : 1]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        const readRewards: RewardEntry[] = [];

        if (trigger.stringData.length > 0) {
            const splittedRewards = trigger.stringData.split(';');

            for (const rawReward of splittedRewards) {
                const reward = rawReward.split(',');

                if (reward.length !== 3) continue;

                readRewards.push(parseRewardEntry(reward[0], reward[1], reward[2]));
            }
        }

        if (readRewards.length === 0) readRewards.push(createReward());

        const interval = trigger.intData.length > 0 ? trigger.intData[0] : 0;
        const limit = trigger.intData.length > 2 ? trigger.intData[2] : 0;

        setRewardTime(interval);
        setUniqueRewards(trigger.intData.length > 1 ? trigger.intData[1] === 1 : false);
        setRewardsLimit(limit > 0 ? clampPrizeLimit(limit) : MIN_PRIZE_LIMIT);
        setLimitationInterval(interval > 0 && trigger.intData.length > 3 ? String(Math.max(1, trigger.intData[3])) : '1');
        setLimitEnabled(limit > 0);
        setError(null);
        setUserSource(slotUserSource(trigger));
        setRewards(readRewards);
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredActionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                validate={validate}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                <div className="flex flex-col gap-1">
                    <Text bold>Reward limit</Text>
                    <div className="flex items-center gap-1">
                        <Checkbox checked={limitEnabled} id="limitEnabled" aria-label="Reward limit" onCheckedChange={(nextChecked) => setLimitEnabled(nextChecked)} />
                        <Text>{LocalizeText('wiredfurni.params.prizelimit', ['amount'], [''])}</Text>
                        <OctaneInput
                            aria-label="Prize limit"
                            className="w-[60px]"
                            max={MAX_PRIZE_LIMIT}
                            min={MIN_PRIZE_LIMIT}
                            type="number"
                            value={rewardsLimit}
                            onChange={(event) => setRewardsLimit(clampPrizeLimit(Number(event.target.value)))}
                        />
                    </div>
                    {!limitEnabled && (
                        <Text small className="text-[#cc0000]">
                            Reward limit not set. Make sure rewards are badges or non-tradeable items.
                        </Text>
                    )}
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>How often can a user be rewarded</Text>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-fit">
                        {REWARD_INTERVALS.map((option) => (
                            <label key={option.value} className="flex items-center gap-1 cursor-pointer">
                                <Radio checked={rewardTime === option.value} name="rewardInterval" onCheckedChange={() => setRewardTime(option.value)} />
                                <Text>{option.label}</Text>
                            </label>
                        ))}
                    </div>
                    <div className="flex items-center gap-1">
                        <Text>n =</Text>
                        <OctaneInput
                            aria-label="n ="
                            className="w-[60px]"
                            disabled={rewardTime === 0}
                            maxLength={4}
                            value={limitationInterval}
                            onChange={(event) => setLimitationInterval(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <Text bold>Unique Rewards</Text>
                    <div className="flex items-center gap-1">
                        <Checkbox checked={uniqueRewards} id="uniqueRewards" aria-label="Unique Rewards?" onCheckedChange={(nextChecked) => setUniqueRewards(nextChecked)} />
                        <Text>Unique Rewards?</Text>
                    </div>
                    <Text small>If checked each reward will be given once to each user. Probabilities are not in use.</Text>
                </div>
                <div className="flex items-center justify-between">
                    <Text bold>Rewards</Text>
                    <Button disabled={rewards.length >= MAX_REWARDS} variant="secondary" onClick={addReward}>
                        Add reward
                    </Button>
                </div>
                <div className="flex flex-col gap-2">
                    {rewards &&
                        rewards.map((reward, index) => {
                            const rewardTypeOptions = reward.rewardType === 'respect' ? REWARD_TYPES : SELECTABLE_REWARD_TYPES;

                            return (
                                <div key={index} className="flex flex-col gap-1 p-1 rounded bg-muted">
                                    <div className="flex items-center gap-1">
                                        <Select
                                            aria-label="Reward type"
                                            className="min-w-0 grow form-select form-select-sm"
                                            value={reward.rewardType}
                                            onChange={(event) =>
                                                updateReward(index, (prevValue) => ({ ...prevValue, rewardType: event.target.value as RewardType, rewardValue: '' }))
                                            }
                                        >
                                            {rewardTypeOptions.map((entry) => (
                                                <option key={entry.value} value={entry.value}>
                                                    {localizeWithFallback(entry.key, entry.label)}
                                                </option>
                                            ))}
                                        </Select>
                                        {index > 0 && (
                                            <Button variant="danger" onClick={() => removeReward(index)}>
                                                <FaTrash className="fa-icon" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-[2px]">
                                        <Text small bold>
                                            {getRewardValuePlaceholder(reward.rewardType)}
                                        </Text>
                                        <OctaneInput
                                            aria-label={getRewardValuePlaceholder(reward.rewardType)}
                                            placeholder={getRewardValuePlaceholder(reward.rewardType)}
                                            type={reward.rewardType === 'badge' ? 'text' : 'number'}
                                            value={reward.rewardValue}
                                            onChange={(event) => updateReward(index, (prevValue) => ({ ...prevValue, rewardValue: event.target.value }))}
                                        />
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="flex flex-col gap-[2px] min-w-0 grow">
                                            <Text small bold>
                                                Chance %
                                            </Text>
                                            {uniqueRewards ? (
                                                <Text small className="px-1">
                                                    Unique
                                                </Text>
                                            ) : (
                                                <OctaneInput
                                                    aria-label="Chance %"
                                                    min={0}
                                                    max={100}
                                                    type="number"
                                                    value={reward.probability}
                                                    onChange={(event) => updateReward(index, (prevValue) => ({ ...prevValue, probability: Number(event.target.value) }))}
                                                />
                                            )}
                                        </div>
                                        {reward.rewardType === 'points' && (
                                            <div className="flex flex-col gap-[2px] min-w-0 grow">
                                                <Text small bold>
                                                    {getExtraFieldLabel(reward.rewardType)}
                                                </Text>
                                                <OctaneInput
                                                    aria-label={getExtraFieldLabel(reward.rewardType)}
                                                    min={0}
                                                    placeholder={getExtraFieldPlaceholder(reward.rewardType)}
                                                    type="number"
                                                    value={reward.pointsType}
                                                    onChange={(event) => updateReward(index, (prevValue) => ({ ...prevValue, pointsType: Number(event.target.value) }))}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                </div>
                {error && (
                    <Text small className="text-red-500" data-testid="give-reward-error">
                        {error}
                    </Text>
                )}
                {hasCustomCurrencyReward && (
                    <Text center small className="p-1 rounded bg-muted">
                        Extra Currency uses Amount as the quantity and Currency Type as the purse type id. Example: amount 200 + type 105.
                    </Text>
                )}
            </WiredActionBaseView>
        </NativeTextTree>
    );
};
