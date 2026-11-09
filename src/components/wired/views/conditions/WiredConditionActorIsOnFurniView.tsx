import { FC, useEffect, useState } from 'react';
import { WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionActorIsOnFurniView: FC = () => {
    // Official layout: no int params, the furni and users in the official source slots; the quantifier is the base view's.
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => trigger?.furniSourceTypes?.[0] ?? ((trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0));
    const [userSource, setUserSource] = useState<number>(() => trigger?.userSourceTypes?.[0] ?? 0);

    useEffect(() => {
        if (!trigger) return;

        setFurniSource(trigger.furniSourceTypes?.[0] ?? ((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0));
        setUserSource(trigger.userSourceTypes?.[0] ?? 0);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const save = () => {
        setIntParams([]);
        setSourceTypes({ furni: [furniSource], users: [userSource] });
    };

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID;

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={true}
                requiresFurni={requiresFurni}
                save={save}
                footer={
                    <WiredSourcesSelector
                        showFurni={true}
                        showUsers={true}
                        furniSource={furniSource}
                        userSource={userSource}
                        onChangeFurni={onChangeFurniSource}
                        onChangeUsers={setUserSource}
                    />
                }
            />
        </NativeTextTree>
    );
};
