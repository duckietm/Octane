import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

const MIN_ALTITUDE = 0;

/**
 * The server clamps every furni to Room.MAXIMUM_FURNI_HEIGHT (40); a higher threshold here would
 * select on a height no furni can reach.
 */
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

export const WiredSelectorFurniAltitudeView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [comparison, setComparison] = useState(1);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const [altitude, setAltitude] = useState(0);
    const [altitudeInput, setAltitudeInput] = useState('0');

    useEffect(() => {
        if (!trigger) return;

        const nextAltitude = parseAltitude(trigger.stringData);

        setComparison(trigger.intData.length > 0 ? trigger.intData[0] : 1);
        setFilterExisting(trigger.intData.length > 1 ? trigger.intData[1] === 1 : false);
        setInvert(trigger.intData.length > 2 ? trigger.intData[2] === 1 : false);
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

    const save = useCallback(() => {
        setIntParams([comparison, filterExisting ? 1 : 0, invert ? 1 : 0]);
        setStringParam(formatAltitude(altitude));
    }, [altitude, comparison, filterExisting, invert, setIntParams, setStringParam]);

    return (
        <WiredSelectorBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
            save={save}
            hideDelay={true}
            cardStyle={{ width: 400 }}
        >
            <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                    {[0, 1, 2].map((value) => {
                        return (
                            <label key={value} className="flex items-center gap-1">
                                <input
                                    checked={comparison === value}
                                    className="form-check-input"
                                    name="furniAltitudeComparison"
                                    type="radio"
                                    onChange={() => setComparison(value)}
                                />
                                <Text>{LocalizeText(`wiredfurni.params.comparison.${value}`)}</Text>
                            </label>
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
                    <Text small>{formatAltitude(altitude)}</Text>
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        checked={filterExisting}
                        onChange={(event) => setFilterExisting(event.target.checked)}
                    />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-2">
                    <input type="checkbox" className="form-check-input" checked={invert} onChange={(event) => setInvert(event.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
