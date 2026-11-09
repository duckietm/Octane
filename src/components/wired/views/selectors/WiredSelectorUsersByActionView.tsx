import { FC, useCallback, useEffect, useState } from 'react';
import { readWiredUserAction, wiredUserActionExtra, WiredUserActionChoice } from '../../../../api';
import { useWired } from '../../../../hooks';
import { WiredUserActionSection } from '../WiredUserActionSection';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';


export const WiredSelectorUsersByActionView: FC<{}> = () => {
    const [choice, setChoice] = useState<WiredUserActionChoice>(() => readWiredUserAction([], ''));
    const { trigger = null, setIntParams = null, setStringParam = null } = useWired();

    useEffect(() => {
        if (!trigger) return;

        setChoice(readWiredUserAction(trigger.intData ?? [], trigger.stringData ?? ''));
    }, [trigger]);

    // Official: [action], the sign / dance extra in the string, filter and invert in the selector switches.
    const save = useCallback(() => {
        setIntParams([choice.action]);
        setStringParam(wiredUserActionExtra(choice));
    }, [choice, setIntParams, setStringParam]);

    return (
        <NativeTextTree>
            <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: 400 }}>
                <div className="flex flex-col gap-2">
                    <WiredUserActionSection choice={choice} onChange={setChoice} />
                </div>
            </WiredSelectorBaseView>
        </NativeTextTree>
    );
};
