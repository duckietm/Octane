import { FC, useEffect, useState } from 'react';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Button, Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { OctaneInput } from '../../../../layout';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

type RewardType = 'badge' | 'credits' | 'pixels' | 'diamonds' | 'points' | 'furni' | 'respect';

interface RewardEntry {
    rewardType: RewardType;
    rewardValue: string;
    probability: number;
    pointsType: number;
}

const DEFAULT_PROBABILITY = 100;
const DEFAULT_POINTS_TYPE = 5;

const REWARD_TYPES: { value: RewardType; label: string }[] = [
    { value: 'badge', label: 'Badge' },
    { value: 'credits', label: 'Credits' },
    { value: 'pixels', label: 'Pixels / Duckets' },
    { value: 'diamonds', label: 'Diamonds' },
    { value: 'points', label: 'Extra Currency' },
    { value: 'furni', label: 'Furni' },
    { value: 'respect', label: 'Respect' }
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

export const WiredActionGiveRewardView: FC<{}> = (props) => {
    const [limitEnabled, setLimitEnabled] = useState(false);
    const [rewardTime, setRewardTime] = useState(1);
    const [uniqueRewards, setUniqueRewards] = useState(false);
    const [rewardsLimit, setRewardsLimit] = useState(1);
    const [limitationInterval, setLimitationInterval] = useState(1);
    const [rewards, setRewards] = useState<RewardEntry[]>([]);
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => {
        if (trigger?.intData?.length > 4) return trigger.intData[4];
        return 0;
    });

    const addReward = () => setRewards((rewards) => [...rewards, createReward()]);
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

    const save = () => {
        let stringRewards = [];

        for (const reward of rewards) {
            const rewardValue = reward.rewardValue.trim();

            if (!rewardValue) continue;

            const probability = Math.max(0, Number.isFinite(reward.probability) ? reward.probability : DEFAULT_PROBABILITY);
            const rewardCode = (() => {
                if (reward.rewardType === 'badge') return rewardValue;
                if (reward.rewardType === 'points') return `points${Math.max(0, reward.pointsType)}#${rewardValue}`;

                return `${reward.rewardType}#${rewardValue}`;
            })();

            const rewardsString = [reward.rewardType === 'badge' ? '0' : '1', rewardCode, (uniqueRewards ? DEFAULT_PROBABILITY : probability).toString()];
            stringRewards.push(rewardsString.join(','));
        }

        if (stringRewards.length > 0) {
            setStringParam(stringRewards.join(';'));
            setIntParams([rewardTime, uniqueRewards ? 1 : 0, rewardsLimit, limitationInterval, userSource]);
        }
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

        setRewardTime(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUniqueRewards(trigger.intData.length > 1 ? trigger.intData[1] === 1 : false);
        setRewardsLimit(trigger.intData.length > 2 ? trigger.intData[2] : 0);
        setLimitationInterval(trigger.intData.length > 3 ? trigger.intData[3] : 0);
        setLimitEnabled(trigger.intData.length > 3 ? trigger.intData[3] > 0 : false);
        setUserSource(trigger.intData.length > 4 ? trigger.intData[4] : 0);
        setRewards(readRewards);
    }, [trigger]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            <div className="flex items-center gap-1">
                <input checked={limitEnabled} className="form-check-input" id="limitEnabled" type="checkbox" onChange={(event) => setLimitEnabled(event.target.checked)} />
                <Text>{LocalizeText('wiredfurni.params.prizelimit', ['amount'], [limitEnabled ? rewardsLimit.toString() : ''])}</Text>
            </div>
            {!limitEnabled && (
                <Text center small className="p-1 rounded bg-muted">
                    Reward limit not set. Make sure rewards are badges or non-tradeable items.
                </Text>
            )}
            {limitEnabled && <Slider max={1000} min={1} value={rewardsLimit} onChange={(event) => setRewardsLimit(event)} />}
            <hr className="m-0 bg-dark" />
            <div className="flex flex-col gap-1">
                <Text bold>How often can a user be rewarded?</Text>
                <div className="flex gap-1">
                    <select className="w-full form-select form-select-sm" value={rewardTime} onChange={(e) => setRewardTime(Number(e.target.value))}>
                        <option value="0">Once</option>
                        <option value="3">Once every {limitationInterval} minutes</option>
                        <option value="2">Once every {limitationInterval} hours</option>
                        <option value="1">Once every {limitationInterval} days</option>
                    </select>
                    {rewardTime > 0 && (
                        <OctaneInput type="number" value={limitationInterval} onChange={(event) => setLimitationInterval(Number(event.target.value))} />
                    )}
                </div>
            </div>
            <hr className="m-0 bg-dark" />
            <div className="flex items-center gap-1">
                <input
                    checked={uniqueRewards}
                    className="form-check-input"
                    id="uniqueRewards"
                    type="checkbox"
                    onChange={(e) => setUniqueRewards(e.target.checked)}
                />
                <Text>Unique rewards</Text>
            </div>
            <Text center small className="p-1 rounded bg-muted">
                If checked each reward will be given once to each user. This will disable the probabilities option.
            </Text>
            <hr className="m-0 bg-dark" />
            <div className="flex items-center justify-between">
                <Text bold>Rewards</Text>
                <Button variant="success" onClick={addReward}>
                    <FaPlus className="fa-icon" />
                </Button>
            </div>
            <div className="flex flex-col gap-1">
                <div className="grid grid-cols-[1.2fr_1fr_110px_150px_42px] gap-1 px-1">
                    <Text small bold>
                        Type
                    </Text>
                    <Text small bold>
                        Amount / Value
                    </Text>
                    <Text small bold>
                        {uniqueRewards ? 'Mode' : 'Chance %'}
                    </Text>
                    <Text small bold>
                        {hasCustomCurrencyReward ? 'Currency Type' : 'Extra / Info'}
                    </Text>
                    <Text small bold>
                        Action
                    </Text>
                </div>
                {rewards &&
                    rewards.map((reward, index) => {
                        const rewardTypeOptions = reward.rewardType === 'respect' ? REWARD_TYPES : SELECTABLE_REWARD_TYPES;

                        return (
                            <div key={index} className="grid grid-cols-[1.2fr_1fr_110px_150px_42px] gap-1">
                                <select
                                    className="w-full form-select form-select-sm"
                                    value={reward.rewardType}
                                    onChange={(event) =>
                                        updateReward(index, (prevValue) => ({ ...prevValue, rewardType: event.target.value as RewardType, rewardValue: '' }))
                                    }
                                >
                                    {rewardTypeOptions.map((entry) => (
                                        <option key={entry.value} value={entry.value}>
                                            {entry.label}
                                        </option>
                                    ))}
                                </select>
                                <OctaneInput
                                    placeholder={getRewardValuePlaceholder(reward.rewardType)}
                                    type={reward.rewardType === 'badge' ? 'text' : 'number'}
                                    value={reward.rewardValue}
                                    onChange={(event) => updateReward(index, (prevValue) => ({ ...prevValue, rewardValue: event.target.value }))}
                                />
                                {uniqueRewards ? (
                                    <div className="flex items-center px-2 rounded bg-muted">
                                        <Text small>Unique</Text>
                                    </div>
                                ) : (
                                    <OctaneInput
                                        min={0}
                                        max={100}
                                        placeholder="Chance %"
                                        type="number"
                                        value={reward.probability}
                                        onChange={(event) => updateReward(index, (prevValue) => ({ ...prevValue, probability: Number(event.target.value) }))}
                                    />
                                )}
                                {reward.rewardType === 'points' ? (
                                    <OctaneInput
                                        min={0}
                                        placeholder={getExtraFieldPlaceholder(reward.rewardType)}
                                        type="number"
                                        value={reward.pointsType}
                                        onChange={(event) => updateReward(index, (prevValue) => ({ ...prevValue, pointsType: Number(event.target.value) }))}
                                    />
                                ) : (
                                    <div className="flex items-center px-2 rounded bg-muted">
                                        <Text small>{getExtraFieldLabel(reward.rewardType)}</Text>
                                    </div>
                                )}
                                <div className="flex items-center justify-end">
                                    {index > 0 && (
                                        <Button variant="danger" onClick={(event) => removeReward(index)}>
                                            <FaTrash className="fa-icon" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
            </div>
            <Text center small className="p-1 rounded bg-muted">
                Extra Currency uses Amount as the quantity and Currency Type as the purse type id. Example: amount 200 + type 105.
            </Text>
        </WiredActionBaseView>
    );
};
