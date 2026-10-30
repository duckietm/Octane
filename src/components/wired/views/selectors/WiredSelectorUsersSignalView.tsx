import { FC, useCallback } from 'react';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersSignalView: FC<{}> = () => {
    const { setIntParams = null } = useWired();

    const save = useCallback(() => {
        setIntParams([]);
    }, [setIntParams]);

    return (
        <NativeTextTree>
            <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }} />
        </NativeTextTree>
    );
};
