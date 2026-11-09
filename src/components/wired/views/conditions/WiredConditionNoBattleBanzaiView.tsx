import { FC } from 'react';
import { WiredFurniType } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

export const WiredConditionNoBattleBanzaiView: FC<{}> = () =>
{
    const { setIntParams = null, setStringParam = null } = useWired();

    const save = () =>
    {
        setIntParams([]);
        setStringParam('');
    };

    return (
        <NativeTextTree>
            <WiredConditionBaseView
                hasSpecialInput={ true }
                requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE }
                save={ save } />
        </NativeTextTree>
    );
};
