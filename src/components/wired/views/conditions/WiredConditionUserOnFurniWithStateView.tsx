import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionUserOnFurniWithStateView: FC<{}> = () =>
{
    // As user on furni: no int params, the furni and users in the official source slots, the required state in the
    // string; the quantifier is the base view's.
    const { trigger = null, setIntParams = null, setStringParam = null, setSourceTypes = null } = useWired();
    const [ furniSource, setFurniSource ] = useState<number>(() => trigger?.furniSourceTypes?.[0] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0));
    const [ userSource, setUserSource ] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);
    const [ requiredState, setRequiredState ] = useState<string>(() => trigger?.stringData ?? '');

    useEffect(() =>
    {
        if(!trigger) return;

        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0));
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
        setRequiredState(trigger.stringData ?? '');
    }, [ trigger ]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () =>
    {
        setIntParams([]);
        setSourceTypes({ furni: [ furniSource ], users: [ userSource ] });
        setStringParam(requiredState ?? '');
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={ true }
                requiresFurni={ requiresFurni }
                save={ save }
                footer={ (
                    <WiredSourcesSelector
                        showFurni={ true }
                        showUsers={ true }
                        furniSource={ furniSource }
                        userSource={ userSource }
                        onChangeFurni={ onChangeFurniSource }
                        onChangeUsers={ setUserSource } />
                ) }>
                <div className="flex flex-col gap-1">
                    <Text bold>{ localizeWithFallback('wiredfurni.params.state', 'State') }</Text>
                    <input className="form-control form-control-sm" type="text" value={ requiredState } onChange={ event => setRequiredState(event.target.value) } />
                </div>
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
