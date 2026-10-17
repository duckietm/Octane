import { FC, useEffect, useMemo, useState } from 'react';
import {
    findWiredArrayDefinition,
    IWiredArrayCapturePayload,
    localizeWithFallback,
    parseWiredArrayCapturePayload,
    serializeWiredArrayCapturePayload,
    WIRED_ARRAY_CAPTURE_DIRECTION_FIRST,
    WIRED_ARRAY_CAPTURE_DIRECTION_LAST,
    WIRED_ARRAY_CAPTURE_DIRECTION_RANDOM,
    WIRED_ARRAY_CAPTURE_MODE_FIND,
    WIRED_ARRAY_CAPTURE_MODE_INDEX,
    WIRED_ARRAY_CRITERIA_ALL,
    WIRED_ARRAY_CRITERIA_ANY,
    wiredArrayCaptureIntParams,
    WiredFurniType
} from '../../../../api';
import { Text } from '../../../../common';
import { useWired, useWiredTools } from '../../../../hooks';
import { WiredArrayCriteriaEditor } from '../arrays/WiredArrayCriteriaEditor';
import { WiredArrayDefinitionSelect } from '../arrays/WiredArrayDefinitionSelect';
import {
    wiredArrayAddressAsValue,
    WIRED_ARRAY_OWNER_SOURCE_FALLBACKS,
    wiredArrayOwnerSources,
    WiredArrayValueField,
    wiredArrayValueAsAddress
} from '../arrays/WiredArrayValueField';
import { WiredExtraBaseView } from './WiredExtraBaseView';
import { Checkbox } from '../../../../common/Checkbox';
import { Radio } from '../../../../common/Radio';

const DIRECTION_OPTIONS: Array<{ fallback: string; value: number }> = [
    { fallback: 'the first match', value: WIRED_ARRAY_CAPTURE_DIRECTION_FIRST },
    { fallback: 'the last match', value: WIRED_ARRAY_CAPTURE_DIRECTION_LAST },
    { fallback: 'a random match', value: WIRED_ARRAY_CAPTURE_DIRECTION_RANDOM }
];

export const WiredExtraArrayCaptureView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setStringParam = null, setAllowsFurni = null } = useWired();
    const { contextVariableDefinitions = [] } = useWiredTools();
    const [payload, setPayload] = useState<IWiredArrayCapturePayload>(() => parseWiredArrayCapturePayload(''));

    useEffect(() => {
        if (!trigger) return;

        const next = parseWiredArrayCapturePayload(trigger.stringData);
        const intData = trigger.intData ?? [];
        const readInt = (index: number, fallback: number) => (intData.length > index ? intData[index] : fallback);

        setPayload({
            ...next,
            captureMode: readInt(2, next.captureMode),
            criteriaMode: readInt(4, next.criteriaMode),
            findDirection: readInt(3, next.findDirection),
            ownerSource: readInt(1, next.ownerSource),
            variableType: readInt(0, next.variableType)
        });
    }, [trigger]);

    useEffect(() => setAllowsFurni(WiredFurniType.STUFF_SELECTION_OPTION_NONE), [setAllowsFurni]);

    const definition = useMemo(
        () => findWiredArrayDefinition(payload.variableDefinitions, payload.variableType, payload.variableItemId),
        [payload.variableDefinitions, payload.variableItemId, payload.variableType]
    );
    const ownerSources = useMemo(() => wiredArrayOwnerSources(payload.variableType), [payload.variableType]);
    const contextTargets = useMemo(() => contextVariableDefinitions.filter((entry) => entry.hasValue), [contextVariableDefinitions]);
    const isFind = payload.captureMode === WIRED_ARRAY_CAPTURE_MODE_FIND;

    const save = () => {
        setStringParam(serializeWiredArrayCapturePayload(payload));
        setIntParams(wiredArrayCaptureIntParams(payload));
    };

    const validate = () => {
        if (!definition) return false;
        if (!payload.contextVariableItemId) return false;
        if (isFind && !payload.criteria.length) return false;

        return true;
    };

    return (
        <WiredExtraBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} validate={validate} cardStyle={{ width: 260 }}>
            <div className="flex flex-col gap-2">
                <WiredArrayDefinitionSelect
                    definitions={payload.variableDefinitions}
                    itemId={payload.variableItemId}
                    variableType={payload.variableType}
                    onChange={(variableType, itemId) => setPayload({ ...payload, variableItemId: itemId, variableType })}
                />

                {ownerSources.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.arrays.owner', 'Whose array')}</Text>
                        <select
                            className="form-select form-select-sm"
                            value={payload.ownerSource}
                            onChange={(event) => setPayload({ ...payload, ownerSource: parseInt(event.target.value, 10) })}
                        >
                            {ownerSources.map((source) => (
                                <option key={source.value} value={source.value}>
                                    {localizeWithFallback(source.label, WIRED_ARRAY_OWNER_SOURCE_FALLBACKS[source.value])}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="flex gap-2">
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Radio checked={!isFind} name="wiredArrayCaptureMode" onCheckedChange={() => setPayload({ ...payload, captureMode: WIRED_ARRAY_CAPTURE_MODE_INDEX })} />
                        <Text>{localizeWithFallback('wiredfurni.params.arrays.capture.index', 'By index')}</Text>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                        <Radio checked={isFind} name="wiredArrayCaptureMode" onCheckedChange={() => setPayload({ ...payload, captureMode: WIRED_ARRAY_CAPTURE_MODE_FIND })} />
                        <Text>{localizeWithFallback('wiredfurni.params.arrays.capture.find', 'By search')}</Text>
                    </label>
                </div>

                {!isFind && (
                    <WiredArrayValueField
                        constantMin={0}
                        label={localizeWithFallback('wiredfurni.params.arrays.index', 'Index')}
                        recentScope="array-capture-index"
                        value={wiredArrayAddressAsValue(payload.index)}
                        onChange={(value) => setPayload({ ...payload, index: wiredArrayValueAsAddress(value, payload.index) })}
                    />
                )}

                {isFind && (
                    <>
                        <WiredArrayCriteriaEditor
                            criteria={payload.criteria}
                            definition={definition}
                            onChange={(criteria) => setPayload({ ...payload, criteria })}
                        />
                        <label className="flex items-center gap-1 cursor-pointer">
                            <Checkbox checked={payload.criteriaMode === WIRED_ARRAY_CRITERIA_ANY} onCheckedChange={(nextChecked) => setPayload({ ...payload, criteriaMode: nextChecked ? WIRED_ARRAY_CRITERIA_ANY : WIRED_ARRAY_CRITERIA_ALL })} />
                            <Text>{localizeWithFallback('wiredfurni.params.arrays.criteria.any', 'An entry counts if any rule fits')}</Text>
                        </label>
                        <div className="flex flex-col gap-1">
                            <Text bold>{localizeWithFallback('wiredfurni.params.arrays.capture.direction', 'Take')}</Text>
                            <select
                                className="form-select form-select-sm"
                                value={payload.findDirection}
                                onChange={(event) => setPayload({ ...payload, findDirection: parseInt(event.target.value, 10) })}
                            >
                                {DIRECTION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {localizeWithFallback(`wiredfurni.params.arrays.capture.direction.${option.value}`, option.fallback)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                <div className="flex flex-col gap-1">
                    <Text bold>{localizeWithFallback('wiredfurni.params.arrays.capture.into', 'Store it in')}</Text>
                    <select
                        className="form-select form-select-sm"
                        value={payload.contextVariableItemId}
                        onChange={(event) => setPayload({ ...payload, contextVariableItemId: parseInt(event.target.value, 10) })}
                    >
                        <option value={0}>{localizeWithFallback('wiredfurni.params.arrays.capture.into.none', 'Choose a Context variable…')}</option>
                        {contextTargets.map((entry) => (
                            <option key={entry.itemId} value={entry.itemId}>
                                {entry.name}
                            </option>
                        ))}
                    </select>
                    {!contextTargets.length && (
                        <Text small className="text-black/60">
                            {localizeWithFallback(
                                'wiredfurni.params.arrays.capture.into.empty',
                                'Place a Context variable box holding a value first - the capturer writes into one, it does not make one.'
                            )}
                        </Text>
                    )}
                </div>
            </div>
        </WiredExtraBaseView>
    );
};
