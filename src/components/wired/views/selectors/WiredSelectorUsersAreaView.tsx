import { GetRoomEngine, RoomAreaSelectionManager } from '@octane/renderer';
import { FC, useCallback, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredSelectorBaseView } from './WiredSelectorBaseView';

export const WiredSelectorUsersAreaView: FC<{}> = (props) => {
    const [rootX, setRootX] = useState(0);
    const [rootY, setRootY] = useState(0);
    const [areaWidth, setAreaWidth] = useState(0);
    const [areaHeight, setAreaHeight] = useState(0);
    const [filterExisting, setFilterExisting] = useState(false);
    const [invert, setInvert] = useState(false);
    const { trigger = null, setIntParams } = useWired();

    const save = useCallback(() => {
        setIntParams([rootX, rootY, areaWidth, areaHeight, filterExisting ? 1 : 0, invert ? 1 : 0]);
    }, [rootX, rootY, areaWidth, areaHeight, filterExisting, invert, setIntParams]);

    useEffect(() => {
        if (!trigger) return;

        const callback = (x: number, y: number, w: number, h: number) => {
            setRootX(x);
            setRootY(y);
            setAreaWidth(w);
            setAreaHeight(h);
        };

        const activated = GetRoomEngine().areaSelectionManager.activate(callback, RoomAreaSelectionManager.HIGHLIGHT_BRIGHTEN);

        if (activated) {
            if (trigger.intData.length >= 4 && trigger.intData[2] > 0 && trigger.intData[3] > 0) {
                GetRoomEngine().areaSelectionManager.setHighlight(trigger.intData[0], trigger.intData[1], trigger.intData[2], trigger.intData[3]);
            }
        }

        return () => {
            GetRoomEngine().areaSelectionManager.deactivate();
        };
    }, [trigger]);

    useEffect(() => {
        if (!trigger) return;

        if (trigger.intData.length >= 4) {
            setRootX(trigger.intData[0]);
            setRootY(trigger.intData[1]);
            setAreaWidth(trigger.intData[2]);
            setAreaHeight(trigger.intData[3]);
        } else {
            setRootX(0);
            setRootY(0);
            setAreaWidth(0);
            setAreaHeight(0);
        }

        setFilterExisting(trigger.intData.length >= 5 && trigger.intData[4] === 1);
        setInvert(trigger.intData.length >= 6 && trigger.intData[5] === 1);
    }, [trigger]);

    useEffect(() => {
        if (!trigger) return;

        GetRoomEngine().areaSelectionManager.setHighlightType(invert ? RoomAreaSelectionManager.HIGHLIGHT_GREEN : RoomAreaSelectionManager.HIGHLIGHT_BRIGHTEN);
    }, [invert, trigger]);

    const hasArea = areaWidth > 0 && areaHeight > 0;

    return (
        <WiredSelectorBaseView hasSpecialInput={true} requiresFurni={0} save={save} hideDelay={true} cardStyle={{ width: '385px' }}>
            <div className="flex flex-col gap-2">
                <Text bold>{LocalizeText('wiredfurni.params.area_selection')}</Text>
                <Text small>{LocalizeText('wiredfurni.params.area_selection.info')}</Text>

                <div className="flex gap-1">
                    <Button fullWidth variant="primary" onClick={() => GetRoomEngine().areaSelectionManager.startSelecting()}>
                        {LocalizeText('wiredfurni.params.area_selection.select')}
                    </Button>
                    <Button
                        fullWidth
                        variant="secondary"
                        onClick={() => {
                            GetRoomEngine().areaSelectionManager.clearHighlight();
                            setRootX(0);
                            setRootY(0);
                            setAreaWidth(0);
                            setAreaHeight(0);
                        }}
                    >
                        {LocalizeText('wiredfurni.params.area_selection.clear')}
                    </Button>
                </div>

                <hr className="m-0 bg-dark" />

                <Text bold>{LocalizeText('wiredfurni.params.selector_options_selector')}</Text>

                <label className="flex items-center gap-1">
                    <input type="checkbox" className="form-check-input" checked={filterExisting} onChange={(e) => setFilterExisting(e.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.0')}</Text>
                </label>

                <label className="flex items-center gap-1">
                    <input type="checkbox" className="form-check-input" checked={invert} onChange={(e) => setInvert(e.target.checked)} />
                    <Text small>{LocalizeText('wiredfurni.params.selector_option.1')}</Text>
                </label>
            </div>
        </WiredSelectorBaseView>
    );
};
