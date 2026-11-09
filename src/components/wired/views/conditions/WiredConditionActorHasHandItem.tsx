import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredHandItemField } from '../WiredHandItemField';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionActorHasHandItemView: FC = () => {
    const [handItemId, setHandItemId] = useState(-1);
    // Official layout: [hand item (0 any)], the users in the official source slot; the quantifier is the base view's.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    const save = () => {
        setIntParams([handItemId]);
        setSourceTypes({ furni: [], users: [userSource] });
    };

    useEffect(() => {
        setHandItemId(trigger.intData.length > 0 ? trigger.intData[0] : 0);
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
    }, [trigger]);

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE}
                save={save}
                footer={<WiredSourcesSelector showUsers={true} userSource={userSource} onChangeUsers={setUserSource} />}
            >
                <WiredHandItemField handItemId={handItemId} onChange={setHandItemId} showCopyButton={true} />
            </WiredConditionBaseView>
        </NativeTextTree>
    );
};
