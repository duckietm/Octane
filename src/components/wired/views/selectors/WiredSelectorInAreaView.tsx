import { GetRoomEngine, RoomAreaSelectionManager } from '@octane/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Text } from '../../../../common';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

/**
 * Official InArea (furni in area 7, users in area 13): the area info and the select / clear buttons,
 * ints [rootX, rootY, width, height]. The area manager highlights with "brighten" whatever the
 * options; the buttons stay disabled when it cannot be activated, and "select" while selecting.
 * "Clear" only clears the highlight: the manager then reports the empty area.
 */
export const WiredSelectorInAreaView: FC<{}> = () => {
    const [rootX, setRootX] = useState(0);
    const [rootY, setRootY] = useState(0);
    const [areaWidth, setAreaWidth] = useState(0);
    const [areaHeight, setAreaHeight] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const { trigger = null, setIntParams } = useWired();

    const save = useCallback(() => {
        setIntParams([rootX, rootY, areaWidth, areaHeight]);
    }, [rootX, rootY, areaWidth, areaHeight, setIntParams]);

    useEffect(() => {
        if (!trigger) return;

        const callback = (x: number, y: number, w: number, h: number) => {
            setIsSelecting(false);
            setRootX(x);
            setRootY(y);
            setAreaWidth(w);
            setAreaHeight(h);
        };

        const activated = !!GetRoomEngine().areaSelectionManager.activate(callback, RoomAreaSelectionManager.HIGHLIGHT_BRIGHTEN);

        setIsActive(activated);
        setIsSelecting(false);

        // Restore the saved area highlight when the box is opened again.
        if (activated && trigger.intData.length >= 4 && trigger.intData[2] > 0 && trigger.intData[3] > 0) {
            GetRoomEngine().areaSelectionManager.setHighlight(trigger.intData[0], trigger.intData[1], trigger.intData[2], trigger.intData[3]);
        }

        return () => {
            GetRoomEngine().areaSelectionManager.deactivate();
        };
    }, [trigger]);

    useEffect(() => {
        if (!trigger) return;

        const hasStoredArea = trigger.intData.length >= 4;

        setRootX(hasStoredArea ? trigger.intData[0] : 0);
        setRootY(hasStoredArea ? trigger.intData[1] : 0);
        setAreaWidth(hasStoredArea ? trigger.intData[2] : 0);
        setAreaHeight(hasStoredArea ? trigger.intData[3] : 0);
    }, [trigger]);

    const startSelecting = () => {
        setIsSelecting(true);
        GetRoomEngine().areaSelectionManager.startSelecting();
    };

    return (
        <NativeTextTree>
            <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: '385px' }}>
                <div className="flex flex-col gap-2">
                    <Text bold>{LocalizeText('wiredfurni.params.area_selection')}</Text>
                    <Text small>{LocalizeText('wiredfurni.params.area_selection.info')}</Text>

                    <div className="flex gap-1">
                        <Button disabled={!isActive || isSelecting} fullWidth variant="primary" onClick={startSelecting}>
                            {LocalizeText('wiredfurni.params.area_selection.select')}
                        </Button>
                        <Button disabled={!isActive} fullWidth variant="secondary" onClick={() => GetRoomEngine().areaSelectionManager.clearHighlight()}>
                            {LocalizeText('wiredfurni.params.area_selection.clear')}
                        </Button>
                    </div>

                </div>
            </WiredSelectorBaseView>
        </NativeTextTree>
    );
};
