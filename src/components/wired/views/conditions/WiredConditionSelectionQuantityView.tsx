import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import sourceFurniIcon from '../../../../assets/images/wired/source_furni.png';
import sourceUserIcon from '../../../../assets/images/wired/source_user.png';
import { Button, Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredFurniSelectionSourceRow } from '../WiredFurniSelectionSourceRow';
import { sortWiredSourceOptions, useAvailableUserSources } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const SOURCE_GROUP_USERS = 0;
const SOURCE_GROUP_FURNI = 1;
const SOURCE_TRIGGER = 0;
const SOURCE_SELECTED = 100;
const COMPARISON_OPTIONS = [0, 1, 2];
const MIN_QUANTITY = 0;
const MAX_QUANTITY = 100;
const QUANTITY_PATTERN = /^\d*$/;

const USER_SOURCES = sortWiredSourceOptions(
    [
        { value: 0, label: 'wiredfurni.params.sources.users.0' },
        { value: 200, label: 'wiredfurni.params.sources.users.200' },
        { value: 201, label: 'wiredfurni.params.sources.users.201' }
    ],
    'users'
);

const FURNI_SOURCES = sortWiredSourceOptions(
    [
        { value: 100, label: 'wiredfurni.params.sources.furni.100' },
        { value: 200, label: 'wiredfurni.params.sources.furni.200' },
        { value: 201, label: 'wiredfurni.params.sources.furni.201' },
        { value: 0, label: 'wiredfurni.params.sources.furni.0' }
    ],
    'furni'
);

const SOURCE_GROUP_BUTTONS = [
    { key: 'user', icon: sourceUserIcon, isUserGroup: true },
    { key: 'furni', icon: sourceFurniIcon, isUserGroup: false }
] as const;

const clampQuantity = (value: number) => {
    if (isNaN(value)) return MIN_QUANTITY;

    return Math.max(MIN_QUANTITY, Math.min(MAX_QUANTITY, Math.floor(value)));
};

const normalizeSourceType = (value: number, allowed: number[]) => {
    return allowed.includes(value) ? value : SOURCE_TRIGGER;
};

export const WiredConditionSelectionQuantityView: FC<{}> = () => {
    const { trigger = null, furniIds = [], setFurniIds = null, setIntParams = null, setStringParam = null } = useWired();
    const rawAvailableUserSources = useAvailableUserSources(trigger, USER_SOURCES);
    const availableUserSources = useMemo(() => sortWiredSourceOptions(rawAvailableUserSources, 'users'), [rawAvailableUserSources]);
    const [comparison, setComparison] = useState(1);
    const [quantity, setQuantity] = useState(0);
    const [quantityInput, setQuantityInput] = useState('0');
    const [sourceGroup, setSourceGroup] = useState(SOURCE_GROUP_USERS);
    const [userSource, setUserSource] = useState(SOURCE_TRIGGER);
    const [furniSource, setFurniSource] = useState(SOURCE_TRIGGER);

    useEffect(() => {
        if (!trigger) return;

        const nextComparison = trigger.intData.length > 0 ? trigger.intData[0] : 1;
        const nextQuantity = clampQuantity(trigger.intData.length > 1 ? trigger.intData[1] : 0);
        const nextSourceGroup = trigger.intData.length > 2 && trigger.intData[2] === SOURCE_GROUP_FURNI ? SOURCE_GROUP_FURNI : SOURCE_GROUP_USERS;
        const nextSourceType = trigger.intData.length > 3 ? trigger.intData[3] : SOURCE_TRIGGER;

        setComparison(COMPARISON_OPTIONS.includes(nextComparison) ? nextComparison : 1);
        setQuantity(nextQuantity);
        setQuantityInput(nextQuantity.toString());
        setSourceGroup(nextSourceGroup);
        setUserSource(
            nextSourceGroup === SOURCE_GROUP_USERS
                ? normalizeSourceType(
                      nextSourceType,
                      availableUserSources.map((source) => source.value)
                  )
                : SOURCE_TRIGGER
        );
        setFurniSource(
            nextSourceGroup === SOURCE_GROUP_FURNI
                ? normalizeSourceType(
                      nextSourceType,
                      FURNI_SOURCES.map((source) => source.value)
                  )
                : SOURCE_TRIGGER
        );
    }, [availableUserSources, trigger]);

    const isUserGroup = sourceGroup === SOURCE_GROUP_USERS;
    const activeSources = useMemo(() => (isUserGroup ? availableUserSources : FURNI_SOURCES), [availableUserSources, isUserGroup]);
    const activeSource = isUserGroup ? userSource : furniSource;
    const activeSourceIndex = Math.max(
        0,
        activeSources.findIndex((source) => source.value === activeSource)
    );
    const currentSourceType = activeSources[activeSourceIndex]?.value ?? SOURCE_TRIGGER;
    const requiresFurni =
        !isUserGroup && furniSource === SOURCE_SELECTED ? WiredFurniType.STUFF_SELECTION_OPTION_BY_ID : WiredFurniType.STUFF_SELECTION_OPTION_NONE;

    useEffect(() => {
        if (currentSourceType === activeSource) return;

        if (isUserGroup) setUserSource(currentSourceType);
        else setFurniSource(currentSourceType);
    }, [activeSource, currentSourceType, isUserGroup]);

    const changeGroup = (nextIsUserGroup: boolean) => {
        if (nextIsUserGroup === isUserGroup) return;

        const nextOptions = nextIsUserGroup ? availableUserSources : FURNI_SOURCES;
        const nextIndex = Math.min(activeSourceIndex, Math.max(0, nextOptions.length - 1));
        const nextOption = nextOptions[nextIndex] ?? nextOptions[0];

        setSourceGroup(nextIsUserGroup ? SOURCE_GROUP_USERS : SOURCE_GROUP_FURNI);

        if (!nextOption) return;

        if (nextIsUserGroup) setUserSource(nextOption.value);
        else setFurniSource(nextOption.value);
    };

    const updateQuantity = (value: number) => {
        const nextValue = clampQuantity(value);

        setQuantity(nextValue);
        setQuantityInput(nextValue.toString());
    };

    const updateQuantityInput = (value: string) => {
        if (!QUANTITY_PATTERN.test(value)) return;

        setQuantityInput(value);

        if (!value.length) {
            setQuantity(0);
            return;
        }

        updateQuantity(parseInt(value));
    };

    const save = () => {
        setIntParams([comparison, clampQuantity(quantity), sourceGroup, isUserGroup ? userSource : furniSource]);
        setStringParam('');

        if (requiresFurni <= WiredFurniType.STUFF_SELECTION_OPTION_NONE) setFurniIds([]);
    };

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={requiresFurni} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.comparison_selection')}</Text>
                {COMPARISON_OPTIONS.map((value) => {
                    return (
                        <label key={value} className="flex items-center gap-1">
                            <input
                                checked={comparison === value}
                                className="form-check-input"
                                name="selectionQuantityComparison"
                                type="radio"
                                onChange={() => setComparison(value)}
                            />
                            <Text>{LocalizeText(`wiredfurni.params.comparison.${value}`)}</Text>
                        </label>
                    );
                })}
            </div>
            <div className="flex flex-col gap-2">
                <input
                    className="form-control form-control-sm"
                    inputMode="numeric"
                    max={MAX_QUANTITY}
                    min={MIN_QUANTITY}
                    type="text"
                    value={quantityInput}
                    onBlur={() => setQuantityInput(clampQuantity(quantity).toString())}
                    onChange={(event) => updateQuantityInput(event.target.value)}
                />
                <Slider max={MAX_QUANTITY} min={MIN_QUANTITY} step={1} value={quantity} onChange={(event) => updateQuantity(event as number)} />
                <Text small>{quantity}</Text>
            </div>
            <WiredFurniSelectionSourceRow
                title="wiredfurni.params.sources.merged.title"
                options={activeSources}
                value={activeSource}
                selectionKind={isUserGroup ? 'primary' : 'secondary'}
                selectionActive={!isUserGroup && furniSource === SOURCE_SELECTED}
                selectionCount={furniIds.length}
                selectionLimit={trigger?.maximumItemSelectionCount ?? 20}
                selectionEnabledValues={[SOURCE_SELECTED]}
                showSelectionToggle={false}
                headerContent={
                    <div className="octane-wired__give-var-targets">
                        {SOURCE_GROUP_BUTTONS.map((button) => (
                            <button
                                key={button.key}
                                type="button"
                                className={`octane-wired__give-var-target octane-wired__give-var-target--${button.key} ${isUserGroup === button.isUserGroup ? 'is-active' : ''}`}
                                onClick={() => changeGroup(button.isUserGroup)}
                            >
                                <img src={button.icon} alt={button.key} />
                            </button>
                        ))}
                    </div>
                }
                onChange={(value) => {
                    if (isUserGroup) setUserSource(value);
                    else setFurniSource(value);
                }}
            />
        </WiredConditionBaseView>
    );
};
