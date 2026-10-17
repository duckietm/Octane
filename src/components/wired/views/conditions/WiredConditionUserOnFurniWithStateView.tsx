import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';
import { Radio } from '../../../../common/Radio';

export const WiredConditionUserOnFurniWithStateView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();
    const [ furniSource, setFurniSource ] = useState<number>(() =>
    {
        if(trigger?.intData?.length > 0) return trigger.intData[0];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });
    const [ userSource, setUserSource ] = useState<number>(() =>
    {
        if(trigger?.intData?.length > 1) return trigger.intData[1];
        return 0;
    });
    const [ quantifier, setQuantifier ] = useState<number>(() =>
    {
        if(trigger?.intData?.length > 2) return trigger.intData[2];
        return 0;
    });
    const [ requiredState, setRequiredState ] = useState<string>(() => trigger?.stringData ?? '');

    useEffect(() =>
    {
        if(!trigger) return;

        if(trigger.intData.length > 0) setFurniSource(trigger.intData[0]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);

        if(trigger.intData.length > 1) setUserSource(trigger.intData[1]);
        else setUserSource(0);

        if(trigger.intData.length > 2) setQuantifier(trigger.intData[2] === 1 ? 1 : 0);
        else setQuantifier(0);

        setRequiredState(trigger.stringData ?? '');
    }, [ trigger ]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () =>
    {
        setIntParams([ furniSource, userSource, quantifier ]);
        setStringParam(requiredState ?? '');
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <WiredConditionBaseView
            hasSpecialInput={ true }
            requiresFurni={ requiresFurni }
            save={ save }
            footer={ (
                <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{ LocalizeText('wiredfurni.params.quantifier_selection') }</Text>
                        { [ 0, 1 ].map(value => (
                            <label key={ value } className="flex items-center gap-1">
                                <Radio checked={ (quantifier === value) } name="userOnFurniWithStateQuantifier" onCheckedChange={() => setQuantifier(value)} />
                                <Text>{ LocalizeText(`wiredfurni.params.quantifier.users.${ value }`) }</Text>
                            </label>
                        )) }
                    </div>
                    <WiredSourcesSelector
                        showFurni={ true }
                        showUsers={ true }
                        furniSource={ furniSource }
                        userSource={ userSource }
                        onChangeFurni={ onChangeFurniSource }
                        onChangeUsers={ setUserSource } />
                </div>
            ) }>
            <div className="flex flex-col gap-1">
                <Text bold>{ localizeWithFallback('wiredfurni.params.state', 'State') }</Text>
                <input className="form-control form-control-sm" type="text" value={ requiredState } onChange={ event => setRequiredState(event.target.value) } />
            </div>
        </WiredConditionBaseView>
    );
};
