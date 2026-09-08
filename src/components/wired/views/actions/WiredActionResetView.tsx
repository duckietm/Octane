import { FC } from 'react';
import { WiredFurniType } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';

// The reset boxes take no settings. Saving still has to send an empty int list, otherwise the params
// left over from the last box this window showed go out on the wire.
export const WiredActionResetView: FC<{}> = () => {
    const { setIntParams = null, setStringParam = null } = useWired();

    const save = () => {
        setIntParams([]);
        setStringParam('');
    };

    return <WiredActionBaseView hasSpecialInput={false} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save} />;
};
