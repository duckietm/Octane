import { FC, KeyboardEvent, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredTriggerBaseView } from './WiredTriggerBaseView';
import { Checkbox } from '../../../../common/Checkbox';

export const WiredTriggerPressKeybindView: FC<{}> = () =>
{
    const { trigger = null, setIntParams = null } = useWired();
    const [ matchEnabled, setMatchEnabled ] = useState(false);
    const [ keyCode, setKeyCode ] = useState(0);
    const [ keyLabel, setKeyLabel ] = useState('');

    useEffect(() =>
    {
        if(!trigger) return;

        const value = ((trigger.intData?.length ?? 0) > 0) ? trigger.intData[0] : 0;

        setMatchEnabled(value > 0);
        setKeyCode(value);
        setKeyLabel(value > 0 ? ('Key code ' + value) : '');
    }, [ trigger ]);

    const captureKey = (event: KeyboardEvent<HTMLInputElement>) =>
    {
        event.preventDefault();
        setKeyCode(event.keyCode);
        setKeyLabel(event.key === ' ' ? 'Space' : event.key);
    };

    // The server matches on this key code (0 = any key); the runtime keypress is sent to header 9311.
    const save = () => setIntParams([ matchEnabled ? Math.max(0, keyCode) : 0 ]);

    return (
        <WiredTriggerBaseView hasSpecialInput={ true } requiresFurni={ WiredFurniType.STUFF_SELECTION_OPTION_NONE } save={ save }>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.presskeybind', 'Press keybind')}</Text>
                <Text small>{localizeWithFallback('wiredfurni.params.presskeybind.info', 'Fires when a user presses a key in the room. Leave unchecked to match any key.')}</Text>
                <div className="flex items-center gap-1">
                    <Checkbox checked={ matchEnabled } id="keybindMatchEnabled" onCheckedChange={(nextChecked) => setMatchEnabled(nextChecked)} />
                    <Text>{localizeWithFallback('wiredfurni.params.presskeybind.specific', 'Only a specific key')}</Text>
                </div>
                { matchEnabled &&
                    <input
                        className="form-control form-control-sm"
                        type="text"
                        readOnly
                        placeholder={ localizeWithFallback('wiredfurni.params.presskeybind.placeholder', 'Click here, then press a key') }
                        value={ keyLabel }
                        onKeyDown={ captureKey } /> }
            </div>
        </WiredTriggerBaseView>
    );
};
