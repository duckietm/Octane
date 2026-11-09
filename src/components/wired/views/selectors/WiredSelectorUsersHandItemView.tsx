import { FC, useCallback, useEffect, useState } from 'react';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredHandItemField } from '../WiredHandItemField';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersHandItemView: FC<{}> = () => {
    const [handItemId, setHandItemId] = useState(0);
    const { trigger = null, setIntParams = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        const params = trigger.intData;

        setHandItemId(params.length > 0 ? params[0] : 0);
    }, [trigger]);

    const save = useCallback(() => {
        setIntParams([handItemId]);
    }, [handItemId, setIntParams]);

    return (
        <NativeTextTree>
            <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
                <div className="flex flex-col gap-2">
                    <WiredHandItemField handItemId={handItemId} onChange={setHandItemId} showCopyButton={true} />
                </div>
            </WiredSelectorBaseView>
        </NativeTextTree>
    );
};
