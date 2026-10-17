import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotUserSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

export const GIVE_EFFECT_MAX_ID = 10000;
const DEFAULT_EFFECT_ID = 13;
const DEFAULT_PRIORITY = 2;

const clamp = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min);

/**
 * Official give effect (52, `?_-Xm?`): effect id (0..10000, 13 for a new box), priority (0..2, 2 for
 * a new box) and a two-way type. Ints `[effect id, priority, type]`; the user source is the slot.
 * A box saved before the official layout kept its effect id as text.
 */
export const WiredActionGiveEffectView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [effectId, setEffectId] = useState(String(DEFAULT_EFFECT_ID));
    const [priority, setPriority] = useState(String(DEFAULT_PRIORITY));
    const [effectType, setEffectType] = useState(0);
    const [userSource, setUserSource] = useState(0);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        const legacyId = parseInt(trigger.stringData ?? '', 10);

        setEffectId(String(data.length ? clamp(data[0], 0, GIVE_EFFECT_MAX_ID) : Number.isFinite(legacyId) ? legacyId : DEFAULT_EFFECT_ID));
        setPriority(String(data.length > 1 ? clamp(data[1], 0, 2) : DEFAULT_PRIORITY));
        setEffectType(data[2] === 1 ? 1 : 0);
        setUserSource(slotUserSource(trigger));
    }, [trigger]);

    const save = () => {
        setIntParams([clamp(parseInt(effectId, 10), 0, GIVE_EFFECT_MAX_ID), clamp(parseInt(priority, 10), 0, 2), effectType]);
        setStringParam('');
        setSourceTypes({ furni: [], users: [userSource] });
    };

    const numberSection = (label: string, fallback: string, value: string, max: number, onChange: (value: string) => void) => (
        <div className="flex flex-col gap-1">
            <Text bold>{localizeWithFallback(label, fallback)}</Text>
            <input
                aria-label={fallback}
                className="form-control form-control-sm"
                max={max}
                min={0}
                style={{ maxWidth: 110 }}
                type="number"
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
        </div>
    );

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
        >
            {numberSection('wiredfurni.params.give_effect.id', 'Effect id', effectId, GIVE_EFFECT_MAX_ID, setEffectId)}
            {numberSection('wiredfurni.params.give_effect.priority', 'Priority', priority, 2, setPriority)}
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.give_effect.type', 'Type')}</Text>
                <div className="grid grid-cols-2 gap-1">
                    {[0, 1].map((value) => (
                        <label key={value} className="flex items-center gap-1">
                            <Radio name="giveEffectType" checked={effectType === value} onCheckedChange={() => setEffectType(value)} />
                            <Text>{localizeWithFallback(`wiredfurni.params.give_effect.type.${value}`, `Type ${value + 1}`)}</Text>
                        </label>
                    ))}
                </div>
            </div>
        </WiredActionBaseView>
    );
};
