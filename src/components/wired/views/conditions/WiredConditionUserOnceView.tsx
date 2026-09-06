import { FC } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredConditionBaseView } from './WiredConditionBaseView';

interface WiredConditionUserOnceViewProps {
    /** Once per calendar day instead of once ever. Same dialog, different sentence. */
    daily?: boolean;
}

// Server contract (WiredConditionUserFirstTime / WiredConditionUserDaily): no settings. The box keeps
// its own memory of who has passed, so the window only has to say what the box does.
export const WiredConditionUserOnceView: FC<WiredConditionUserOnceViewProps> = ({ daily = false }) => {
    const { setIntParams = null, setStringParam = null } = useWired();

    const save = () => {
        setIntParams([]);
        setStringParam('');
    };

    return (
        <WiredConditionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <Text small className="text-black/60">
                {daily
                    ? localizeWithFallback(
                          'wiredfurni.params.daily_trigger.info',
                          'Each user passes this condition once per day. Picking the box up forgets everyone.'
                      )
                    : localizeWithFallback(
                          'wiredfurni.params.first_trigger.info',
                          'Each user passes this condition only the first time, ever. Picking the box up forgets everyone.'
                      )}
            </Text>
        </WiredConditionBaseView>
    );
};
