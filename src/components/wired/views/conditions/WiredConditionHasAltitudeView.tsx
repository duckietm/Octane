import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Slider, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

const COUNTER_INTERACTION_TYPES = ['game_upcounter'];
const MIN_ALTITUDE = 0;
const MAX_ALTITUDE = 80;
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

/**
 * Seven conditions borrowed this dialog and inherited things that belong to the altitude check alone.
 * The worst was the counter-only furni gate: it refuses every furni that is not a game counter, which
 * makes "furni in range", "owns furni" and "same height" impossible to configure. They also inherited
 * the altitude label for what is really a radius, a furni source picker where a user source is meant,
 * and a comparison operator four of them never read.
 *
 * The four range boxes read it now. Their middle option is inclusive — "within the radius", the
 * behaviour they always had — so it gets its own label instead of the altitude box's "Equals".
 */
type AltitudeVariant = 'altitude' | 'userRange' | 'furniRange' | 'furniProperty';

const VARIANTS: Record<
    AltitudeVariant,
    { counterOnly: boolean; comparison: boolean; value: 'altitude' | 'radius' | null; users: boolean }
> = {
    altitude: { counterOnly: true, comparison: true, value: 'altitude', users: false },
    userRange: { counterOnly: false, comparison: true, value: 'radius', users: true },
    furniRange: { counterOnly: false, comparison: true, value: 'radius', users: false },
    furniProperty: { counterOnly: false, comparison: false, value: null, users: false }
};

const RANGE_COMPARISON_LABELS: Record<number, { key: string; fallback: string }> = {
    0: { key: 'wiredfurni.params.range.comparison.0', fallback: 'Closer than' },
    1: { key: 'wiredfurni.params.range.comparison.1', fallback: 'Within the radius' },
    2: { key: 'wiredfurni.params.range.comparison.2', fallback: 'Further than' }
};

const VALUE_LABELS = {
    altitude: { key: 'wiredfurni.params.setaltitude', fallback: 'Altitude' },
    radius: { key: 'wiredfurni.params.setradius', fallback: 'Radius in tiles' }
};

interface WiredConditionHasAltitudeViewProps {
    variant?: AltitudeVariant;
}

export const WiredConditionHasAltitudeView: FC<WiredConditionHasAltitudeViewProps> = ({ variant = 'altitude' }) => {
    const spec = VARIANTS[variant];

    const { trigger = null, setIntParams = null, setStringParam = null, setAllowedInteractionTypes = null, setAllowedInteractionErrorKey = null } = useWired();
    const [comparison, setComparison] = useState(1);
    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });
    const [quantifier, setQuantifier] = useState(0);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [altitude, setAltitude] = useState(0);
    const [altitudeInput, setAltitudeInput] = useState('0');

    useEffect(() => {
        if (!spec.counterOnly) return;

        setAllowedInteractionTypes(COUNTER_INTERACTION_TYPES);
        setAllowedInteractionErrorKey('wiredfurni.error.require_counter_furni');

        return () => {
            setAllowedInteractionTypes(null);
            setAllowedInteractionErrorKey(null);
        };
    }, [spec.counterOnly, setAllowedInteractionErrorKey, setAllowedInteractionTypes]);

    useEffect(() => {
        if (!trigger) return;

        const sourceSlot = spec.comparison ? 1 : 0;
        const quantifierSlot = sourceSlot + 1;
        const fallbackSource = (trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0;

        setComparison(spec.comparison && trigger.intData.length > 0 ? trigger.intData[0] : 1);
        setFurniSource(trigger.intData.length > sourceSlot ? trigger.intData[sourceSlot] : fallbackSource);
        setQuantifier(trigger.intData.length > quantifierSlot ? trigger.intData[quantifierSlot] : 0);
        setShowAdvanced(
            trigger.intData.length > sourceSlot
                ? trigger.intData[sourceSlot] !== 0 || trigger.intData[quantifierSlot] !== 0
                : false
        );

        const nextAltitude = parseAltitude(trigger.stringData);
        setAltitude(nextAltitude);
        setAltitudeInput(formatAltitude(nextAltitude));
    }, [spec.comparison, trigger]);

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
        // furniProperty reads [source, quantifier]; the others keep the comparison in slot 0.
        setIntParams(spec.comparison ? [comparison, furniSource, quantifier] : [furniSource, quantifier]);
        setStringParam(spec.value ? formatAltitude(altitude) : '');
    };

    return (
        <WiredConditionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT}
            save={save}
            footerCollapsible={false}
            footer={
                <div className="flex flex-col gap-2">
                    <button className="btn btn-link p-0 align-self-start" type="button" onClick={() => setShowAdvanced((value) => !value)}>
                        {LocalizeText(showAdvanced ? 'wiredfurni.params.sources.collapse' : 'wiredfurni.params.sources.expand')}
                    </button>
                    {showAdvanced && (
                        <>
                            <div className="flex flex-col gap-1">
                                <Text bold>{LocalizeText('wiredfurni.params.quantifier_selection')}</Text>
                                {[0, 1].map((value) => {
                                    return (
                                        <div key={value} className="flex items-center gap-1">
                                            <input
                                                checked={quantifier === value}
                                                className="form-check-input"
                                                id={`altitudeQuantifier${value}`}
                                                name="altitudeQuantifier"
                                                type="radio"
                                                onChange={() => setQuantifier(value)}
                                            />
                                            <Text>{LocalizeText(`wiredfurni.params.quantifier.${spec.users ? 'users' : 'furni'}.${value}`)}</Text>
                                        </div>
                                    );
                                })}
                            </div>
                            {spec.users ? (
                                <WiredSourcesSelector showUsers={true} userSource={furniSource} onChangeUsers={setFurniSource} />
                            ) : (
                                <WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />
                            )}
                        </>
                    )}
                </div>
            }
        >
            {spec.comparison && (
                <div className="flex flex-col gap-2">
                    {[0, 1, 2].map((value) => {
                        return (
                            <div key={value} className="flex items-center gap-1">
                                <input
                                    checked={comparison === value}
                                    className="form-check-input"
                                    id={`altitudeComparison${value}`}
                                    name="altitudeComparison"
                                    type="radio"
                                    onChange={() => setComparison(value)}
                                />
                                <Text>
                                    {spec.value === 'radius'
                                        ? localizeWithFallback(RANGE_COMPARISON_LABELS[value].key, RANGE_COMPARISON_LABELS[value].fallback)
                                        : LocalizeText(`wiredfurni.params.comparison.${value}`)}
                                </Text>
                            </div>
                        );
                    })}
                </div>
            )}
            {spec.value && (
                <>
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback(VALUE_LABELS[spec.value].key, VALUE_LABELS[spec.value].fallback)}</Text>
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
                </>
            )}
        </WiredConditionBaseView>
    );
};
