import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredExtraBaseView } from './WiredExtraBaseView';

/**
 * The first four curves are the ones the official corpus already names under
 * `wiredfurni.params.easing.*`; bounce, elastic and drop are this fork's own, so they carry a key in
 * the same namespace and fall back to English until it is translated.
 */
const CURVE_OPTIONS: { value: number; key: string; fallback: string }[] = [
    { value: 0, key: 'wiredfurni.params.easing.linear', fallback: 'Linear' },
    { value: 1, key: 'wiredfurni.params.easing.ease_in', fallback: 'Ease in' },
    { value: 2, key: 'wiredfurni.params.easing.ease_out', fallback: 'Ease out' },
    { value: 3, key: 'wiredfurni.params.easing.ease_in_out', fallback: 'Ease in / out' },
    { value: 4, key: 'wiredfurni.params.easing.bounce', fallback: 'Bounce' },
    { value: 5, key: 'wiredfurni.params.easing.elastic', fallback: 'Elastic' },
    { value: 6, key: 'wiredfurni.params.easing.drop', fallback: 'Drop' }
];

const CURVE_MAX = 6;
const INTENSITY_MIN = 0;
const INTENSITY_MAX = 100;
const INTENSITY_DEFAULT = 100;

const normalizeCurve = (value: number) => {
    if (isNaN(value)) return 0;
    return Math.max(0, Math.min(CURVE_MAX, value));
};

const normalizeIntensity = (value: number) => {
    if (isNaN(value)) return INTENSITY_DEFAULT;
    return Math.max(INTENSITY_MIN, Math.min(INTENSITY_MAX, Math.round(value)));
};

export const WiredExtraMovementCurveView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [curveType, setCurveType] = useState(0);
    const [intensity, setIntensity] = useState(INTENSITY_DEFAULT);

    useEffect(() => {
        if (!trigger) return;

        setCurveType(normalizeCurve(trigger.intData.length > 0 ? trigger.intData[0] : 0));
        setIntensity(normalizeIntensity(trigger.intData.length > 1 ? trigger.intData[1] : INTENSITY_DEFAULT));
    }, [trigger]);

    const save = () => {
        setIntParams([normalizeCurve(curveType), normalizeIntensity(intensity)]);
        setStringParam('');
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} cardStyle={{ width: 380 }}>
            <div className="flex flex-col gap-2">
                <Text bold>{localizeWithFallback('wiredfurni.params.easing_function', 'Movement curve')}</Text>
                <div className="flex flex-col gap-1">
                    {CURVE_OPTIONS.map((option) => (
                        <label key={option.value} className="flex items-center gap-2">
                            <input
                                type="radio"
                                className="form-check-input"
                                name="curveType"
                                checked={curveType === option.value}
                                onChange={() => setCurveType(option.value)}
                            />
                            <Text small>{localizeWithFallback(option.key, option.fallback)}</Text>
                        </label>
                    ))}
                </div>
                {curveType > 0 && (
                    <div className="flex flex-col gap-1">
                        <Text bold>
                            {localizeWithFallback(
                                'wiredfurni.params.easing.intensity',
                                `Intensity (${intensity}%)`,
                                ['intensity'],
                                [intensity.toString()]
                            )}
                        </Text>
                        <Slider
                            max={INTENSITY_MAX}
                            min={INTENSITY_MIN}
                            step={1}
                            value={intensity}
                            onChange={(value) => setIntensity(normalizeIntensity(value as number))}
                        />
                    </div>
                )}
            </div>
        </WiredExtraBaseView>
    );
};
