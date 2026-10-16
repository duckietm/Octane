import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { getCustomVariableItemId } from '../WiredVariablePickerData';
import { variableTokenFromId, WiredValueOrVariableSection } from '../WiredValueOrVariableSection';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Checkbox } from '../../../../common/Checkbox';

export const CHEST_REWARD_MODE_AMOUNT = 0;
export const CHEST_REWARD_MODE_EVERYTHING = 1;
export const CHEST_POPUP_MAX_LENGTH = 200;
export const CHEST_POPUP_MAX_LINES = 3;
const GLOBAL_TARGET = -10;
const CONTEXT_TARGET = -20;

export const normalizeChestPopup = (text: string) => (text ?? '').replace(/\r/g, '').split('\n').slice(0, CHEST_POPUP_MAX_LINES).join('\n').slice(0, CHEST_POPUP_MAX_LENGTH);

interface ChestRewardExtra {
    /** The collapsed section's title key and fallback. */
    titleKey: string;
    title: string;
    /** The sixth int's choices: value, text key and fallback. */
    options: { value: number; key: string; label: string }[];
    defaultValue: number;
    /** A dropdown (earnings category) or radios (iteration order). */
    dropdown?: boolean;
    /** Official: the iteration order has nothing to choose when the box gives everything. */
    disabledWhenEverything?: boolean;
}

/**
 * The official chest reward editor (`?_-b1s?`) both chest boxes share: rewarding mode, the amount
 * (a value or a global/context variable), the reward popup and a box-specific sixth setting.
 * Ints `[mode, amount, from a variable, target, show popup by default, extra]`, the popup text as the
 * string, the variable id as the definition's variable id; furni slot 0 the chests, user slot 0 the
 * rewarded users.
 */
export const WiredActionChestRewardBaseView: FC<{ extra: ChestRewardExtra }> = ({ extra }) => {
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null, setVariableIds = null } = useWired();
    const [mode, setMode] = useState(CHEST_REWARD_MODE_AMOUNT);
    const [amount, setAmount] = useState('1');
    const [isVariable, setIsVariable] = useState(false);
    const [target, setTarget] = useState(GLOBAL_TARGET);
    const [token, setToken] = useState('');
    const [showByDefault, setShowByDefault] = useState(false);
    const [popupText, setPopupText] = useState('');
    const [extraValue, setExtraValue] = useState(extra.defaultValue);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];

        setMode(data[0] === CHEST_REWARD_MODE_EVERYTHING ? CHEST_REWARD_MODE_EVERYTHING : CHEST_REWARD_MODE_AMOUNT);
        setAmount(String(Math.max(1, data[1] ?? 1)));
        setIsVariable(data[2] === 1);
        setTarget(data[3] === CONTEXT_TARGET ? CONTEXT_TARGET : GLOBAL_TARGET);
        setShowByDefault(data[4] === 1);
        setExtraValue(extra.options.some((option) => option.value === data[5]) ? data[5] : extra.defaultValue);
        setToken(variableTokenFromId(trigger.variableIds?.[0] ?? ''));
        setPopupText(normalizeChestPopup(trigger.stringData ?? ''));
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
    }, [trigger, extra]);

    const save = () => {
        const variableId = isVariable ? getCustomVariableItemId(token) : 0;

        setIntParams([mode, Math.max(1, parseInt(amount, 10) || 1), isVariable ? 1 : 0, target, showByDefault ? 1 : 0, extraValue]);
        setStringParam(normalizeChestPopup(popupText));
        setVariableIds(variableId > 0 ? [String(variableId)] : []);
        setSourceTypes({ furni: [100], users: [userSource] });
    };

    const validate = () => mode === CHEST_REWARD_MODE_EVERYTHING || !isVariable || getCustomVariableItemId(token) > 0;
    const extraDisabled = extra.disabledWhenEverything && mode === CHEST_REWARD_MODE_EVERYTHING;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID}
            save={save}
            validate={validate}
            footer={
                <WiredSourcesSelector
                    showUsers={true}
                    userSource={userSource}
                    usersTitle="wiredfurni.params.sources.users.title.reward_user"
                    onChangeUsers={setUserSource}
                />
            }
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.rewarding_mode', 'Rewarding mode')}</Text>
                {[CHEST_REWARD_MODE_AMOUNT, CHEST_REWARD_MODE_EVERYTHING].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <input type="radio" className="form-check-input" name="chestRewardMode" checked={mode === value} onChange={() => setMode(value)} />
                        <Text>{localizeWithFallback(`wiredfurni.params.rewarding_mode.${value}`, value === 0 ? 'Give a specific amount' : 'Give everything')}</Text>
                    </label>
                ))}
            </div>
            <fieldset className="flex flex-col gap-1" disabled={mode === CHEST_REWARD_MODE_EVERYTHING}>
                <Text bold>{localizeWithFallback('wiredfurni.params.amount_to_give', 'Amount to give:')}</Text>
                <WiredValueOrVariableSection
                    name="chestRewardAmount"
                    isVariable={isVariable}
                    value={amount}
                    target={target}
                    token={token}
                    furniSource={0}
                    userSource={0}
                    min={1}
                    targets={[GLOBAL_TARGET, CONTEXT_TARGET]}
                    onIsVariableChange={setIsVariable}
                    onValueChange={setAmount}
                    onTargetChange={setTarget}
                    onTokenChange={setToken}
                    onFurniSourceChange={() => undefined}
                    onUserSourceChange={() => undefined}
                />
            </fieldset>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.reward_contract.reward_popup', 'Reward popup')}</Text>
                <textarea
                    aria-label="reward popup"
                    className="form-control form-control-sm"
                    maxLength={CHEST_POPUP_MAX_LENGTH}
                    rows={CHEST_POPUP_MAX_LINES}
                    title={localizeWithFallback('wiredfurni.reward_contract.reward_popup.text.tooltip', 'The text shown to the rewarded user')}
                    value={popupText}
                    onChange={(event) => setPopupText(normalizeChestPopup(event.target.value))}
                />
                <label className="flex items-center gap-1">
                    <Checkbox checked={showByDefault} onCheckedChange={(nextChecked) => setShowByDefault(nextChecked)} />
                    <Text>{localizeWithFallback('wiredfurni.reward_contract.reward_popup.show_by_default', 'Show the popup by default')}</Text>
                </label>
            </div>
            <details>
                <summary>
                    <Text bold>{localizeWithFallback(extra.titleKey, extra.title)}</Text>
                </summary>
                <fieldset className="flex flex-col gap-1 pt-1" disabled={extraDisabled}>
                    {extra.dropdown ? (
                        <select aria-label="chest extra" className="form-select form-select-sm" value={extraValue} onChange={(event) => setExtraValue(Number(event.target.value))}>
                            {extra.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {localizeWithFallback(option.key, option.label)}
                                </option>
                            ))}
                        </select>
                    ) : (
                        extra.options.map((option) => (
                            <label key={option.value} className="flex items-center gap-1">
                                <input type="radio" className="form-check-input" name="chestRewardExtra" checked={extraValue === option.value} onChange={() => setExtraValue(option.value)} />
                                <Text>{localizeWithFallback(option.key, option.label)}</Text>
                            </label>
                        ))
                    )}
                </fieldset>
            </details>
        </WiredActionBaseView>
    );
};
