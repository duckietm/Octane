import { FC, useEffect, useMemo, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useAchievements, useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { getCustomVariableItemId } from '../WiredVariablePickerData';
import { normalizeWiredValueTarget, variableTokenFromId, WiredValueOrVariableField } from '../WiredValueOrVariableField';
import { WiredActionBaseView } from './WiredActionBaseView';

/**
 * Habbo's progress-achievement action (`wf_act_progress_achievement`): progresses one of the room's
 * achievements for the chosen users. The list is the room's `WiredEnvironment.enabledAchievements`:
 * what its achievement enablers name and the hotel allows.
 * Server: WiredEffectProgressAchievement, official layout. String param the name, then a tab and the
 * value variable's id; int params `[mode, valueIsVariable, value, valueTarget]`; user sources
 * `[users to progress, value user]`, furni sources `[value furni]`.
 */

export const PROGRESS_ACHIEVEMENT_MODE_RAISE_TO = 0;
export const PROGRESS_ACHIEVEMENT_MODE_ADD = 1;
export const PROGRESS_ACHIEVEMENT_MAX_AMOUNT = 1_000_000;

export const clampProgressAmount = (value: number): number =>
    Number.isFinite(value) ? Math.min(PROGRESS_ACHIEVEMENT_MAX_AMOUNT, Math.max(1, Math.trunc(value))) : 1;

const normalizeMode = (value: number): number => (value === PROGRESS_ACHIEVEMENT_MODE_RAISE_TO ? PROGRESS_ACHIEVEMENT_MODE_RAISE_TO : PROGRESS_ACHIEVEMENT_MODE_ADD);

export const WiredActionProgressAchievementView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const { enabledWiredAchievements = [] } = useAchievements();
    const [achievement, setAchievement] = useState('');
    const [mode, setMode] = useState(PROGRESS_ACHIEVEMENT_MODE_ADD);
    const [amount, setAmount] = useState('1');
    const [userSource, setUserSource] = useState(0);
    const [isVariable, setIsVariable] = useState(false);
    const [valueTarget, setValueTarget] = useState(0);
    const [valueToken, setValueToken] = useState('');
    const [valueFurniSource, setValueFurniSource] = useState(0);
    const [valueUserSource, setValueUserSource] = useState(0);
    const [valueValid, setValueValid] = useState(true);

    useEffect(() => {
        if (!trigger) return;

        const [name = '', variableId = ''] = (trigger.stringData ?? '').split('\t');

        setAchievement(name);
        setMode(normalizeMode(trigger.intData?.[0] ?? PROGRESS_ACHIEVEMENT_MODE_ADD));
        setIsVariable(trigger.intData?.[1] === 1);
        setAmount(String(clampProgressAmount(trigger.intData?.[2] ?? 1)));
        setValueTarget(normalizeWiredValueTarget(trigger.intData?.[3] ?? 0));
        setValueToken(variableTokenFromId(variableId));
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
        setValueUserSource(trigger.userSourceTypes?.[1] ?? 0);
        setValueFurniSource(trigger.furniSourceTypes?.[0] ?? 0);
    }, [trigger]);

    const options = useMemo(() => {
        const names = [...enabledWiredAchievements];

        if (achievement && !names.includes(achievement)) names.unshift(achievement);

        return names;
    }, [enabledWiredAchievements, achievement]);

    const save = () => {
        const variableId = isVariable ? getCustomVariableItemId(valueToken) : 0;

        setStringParam(`${achievement}\t${variableId}`);
        setIntParams([mode, isVariable ? 1 : 0, clampProgressAmount(parseInt(amount, 10)), valueTarget]);
        setSourceTypes({ furni: [valueFurniSource], users: [userSource, valueUserSource] });
    };

    const validate = () => achievement.length > 0 && valueValid && (!isVariable || getCustomVariableItemId(valueToken) > 0);

    return (
        <WiredActionBaseView
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            validate={validate}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.progress_achievement.name', 'Achievement')}</Text>
                {options.length ? (
                    <select className="form-select form-select-sm" value={achievement} onChange={(event) => setAchievement(event.target.value)}>
                        {!achievement && <option value="">{localizeWithFallback('wiredfurni.params.progress_achievement.pick', 'Pick an achievement')}</option>}
                        {options.map((name) => (
                            <option key={name} value={name}>
                                {name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <Text small>
                        {localizeWithFallback(
                            'wiredfurni.params.progress_achievement.none',
                            'No achievements in this room. Name them in an achievement enabler add-on; the hotel must allow them too.'
                        )}
                    </Text>
                )}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.progress_achievement.mode', 'Progress')}</Text>
                {[PROGRESS_ACHIEVEMENT_MODE_ADD, PROGRESS_ACHIEVEMENT_MODE_RAISE_TO].map((value) => (
                    <label key={value} className="flex items-center gap-1">
                        <input type="radio" className="form-check-input" name="progressAchievementMode" checked={mode === value} onChange={() => setMode(value)} />
                        <Text>
                            {localizeWithFallback(
                                `wiredfurni.params.progress_achievement.mode.${value}`,
                                value === PROGRESS_ACHIEVEMENT_MODE_ADD ? 'Add the amount' : 'Raise the progress to the amount'
                            )}
                        </Text>
                    </label>
                ))}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.progress_achievement.score', 'Amount')}</Text>
                {/* AIR ProgressAchievement: createValueOrVariableSection(0, mergedSourceOptions(0), score, 0, int max); the
                    claimed merged slot 0 (furni 0 + users 1) is the value's holder in the popup. The server keeps the
                    amount to 1..1000000 (clampProgressAmount on save). */}
                <WiredValueOrVariableField
                    holderSource={{
                        furniSource: valueFurniSource,
                        userSource: valueUserSource,
                        onFurniSourceChange: setValueFurniSource,
                        onUserSourceChange: setValueUserSource
                    }}
                    isVariable={isVariable}
                    label={localizeWithFallback('wiredfurni.params.progress_achievement.score', 'Amount')}
                    literal={amount}
                    min={0}
                    target={valueTarget}
                    token={valueToken}
                    onIsVariableChange={setIsVariable}
                    onLiteralChange={setAmount}
                    onTargetChange={setValueTarget}
                    onTokenChange={setValueToken}
                    onValidityChange={setValueValid}
                />
            </div>
        </WiredActionBaseView>
    );
};
