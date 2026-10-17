import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

const MIN_ALTITUDE = 0;
const MAX_ALTITUDE = 40;
const ALTITUDE_STEP = 0.01;
const ALTITUDE_PATTERN = /^\d*(\.\d{0,2})?$/;

const clampAltitude = (value: number) => {
    if (isNaN(value)) return MIN_ALTITUDE;

    const clamped = Math.min(MAX_ALTITUDE, Math.max(MIN_ALTITUDE, value));

    return parseFloat(clamped.toFixed(2));
};

const formatAltitude = (value: number) => {
    const normalized = clampAltitude(value);
    const text = normalized.toFixed(2);

    return text.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
};

const parseAltitude = (value: string) => {
    if (!value || !value.trim().length) return 0;

    const parsed = parseFloat(value);

    if (isNaN(parsed)) return 0;

    return clampAltitude(parsed);
};

const OPERATOR_OPTIONS = [
    { value: 0, label: 'wiredfurni.params.operator.0' },
    { value: 1, label: 'wiredfurni.params.operator.1' },
    { value: 2, label: 'wiredfurni.params.operator.2' }
];

const normalizeOperator = (value: number) => {
    if (value < 0 || value > 2) return 2;

    return value;
};

export const WiredActionSetAltitudeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();

    const [operator, setOperator] = useState(2);
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));
    const [altitude, setAltitude] = useState(0);
    const [altitudeInput, setAltitudeInput] = useState('0');

    const normalizedAltitudeText = useMemo(() => formatAltitude(altitude), [altitude]);

    useEffect(() => {
        if (!trigger) return;

        // Official layout: [altitude in hundredths, operator]; the furni source is the official slot.
        const official = (trigger.intData?.length ?? 0) > 1;

        setOperator(normalizeOperator(official ? trigger.intData[1] : (trigger.intData?.[0] ?? 2)));
        setFurniSource(slotFurniSource(trigger));

        const nextAltitude = official ? clampAltitude(trigger.intData[0] / 100) : parseAltitude(trigger.stringData);
        setAltitude(nextAltitude);
        setAltitudeInput(formatAltitude(nextAltitude));
    }, [trigger]);

    const updateAltitude = (value: number) => {
        const nextValue = clampAltitude(value);

        setAltitude(nextValue);
        setAltitudeInput(formatAltitude(nextValue));
    };

    const updateAltitudeInput = (value: string) => {
        if (!ALTITUDE_PATTERN.test(value)) return;

        setAltitudeInput(value);

        if (!value.length) {
            setAltitude(0);
            return;
        }

        const parsedValue = parseFloat(value);

        if (isNaN(parsedValue)) return;

        if (parsedValue > MAX_ALTITUDE) {
            updateAltitude(MAX_ALTITUDE);
            return;
        }

        setAltitude(clampAltitude(parsedValue));
    };

    const save = () => {
        setIntParams([Math.round(clampAltitude(altitude) * 100), operator]);
        setStringParam('');
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.choose_type')}</Text>
                {OPERATOR_OPTIONS.map((option) => {
                    return (
                        <div key={option.value} className="flex items-center gap-1">
                            <Radio checked={operator === option.value} id={`setAltitudeOperator${option.value}`} name="setAltitudeOperator" onCheckedChange={() => setOperator(option.value)} />
                            <Text>{LocalizeText(option.label)}</Text>
                        </div>
                    );
                })}
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.setaltitude')}</Text>
                <input
                    className="form-control form-control-sm"
                    inputMode="decimal"
                    type="text"
                    value={altitudeInput}
                    onBlur={() => setAltitudeInput(formatAltitude(altitude))}
                    onChange={(event) => updateAltitudeInput(event.target.value)}
                />
            </div>
            <div className="flex flex-col gap-1">
                <Slider max={MAX_ALTITUDE} min={MIN_ALTITUDE} step={ALTITUDE_STEP} value={altitude} onChange={(event) => updateAltitude(event as number)} />
                <Text small>{normalizedAltitudeText}</Text>
            </div>
        </WiredActionBaseView>
    );
};
