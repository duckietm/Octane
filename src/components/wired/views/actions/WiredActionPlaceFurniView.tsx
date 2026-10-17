import { FC, useEffect, useState } from 'react';
import { localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

// Server saveData expects [baseItemId, quantity, placementMode, storedX, storedY, rotation].
const MODE_THIS_TILE = 0;
const MODE_STORED_XY = 1;

export const WiredActionPlaceFurniView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [baseItemId, setBaseItemId] = useState<number>(0);
    const [quantity, setQuantity] = useState<number>(1);
    const [placementMode, setPlacementMode] = useState<number>(MODE_THIS_TILE);
    const [storedX, setStoredX] = useState<number>(0);
    const [storedY, setStoredY] = useState<number>(0);
    const [rotation, setRotation] = useState<number>(0);

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];
        setBaseItemId(data.length > 0 ? data[0] : 0);
        setQuantity(data.length > 1 ? Math.max(1, data[1]) : 1);
        setPlacementMode(data.length > 2 ? data[2] : MODE_THIS_TILE);
        setStoredX(data.length > 3 ? data[3] : 0);
        setStoredY(data.length > 4 ? data[4] : 0);
        setRotation(data.length > 5 ? data[5] : 0);
    }, [trigger]);

    const save = () => setIntParams([baseItemId, Math.max(1, quantity), placementMode, storedX, storedY, rotation]);

    return (
        <WiredActionBaseView hasSpecialInput={true} requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_NONE} save={save}>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.base_item_id', 'Base item ID')}</Text>
                <input
                    className="form-control form-control-sm"
                    type="number"
                    min={1}
                    value={baseItemId}
                    onChange={(event) => setBaseItemId(parseInt(event.target.value, 10) || 0)}
                />
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{localizeWithFallback('wiredfurni.params.count', 'Quantity', ['count'], [quantity.toString()])}</Text>
                <input
                    className="form-control form-control-sm"
                    type="number"
                    min={1}
                    max={10}
                    value={quantity}
                    onChange={(event) => setQuantity(Math.max(1, Math.min(10, parseInt(event.target.value, 10) || 1)))}
                />
            </div>
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                    <Radio name="placementMode" checked={placementMode === MODE_THIS_TILE} onCheckedChange={() => setPlacementMode(MODE_THIS_TILE)} />
                    <Text>{localizeWithFallback('wiredfurni.params.place_furni.target_location.0', "Place on this furni's tile")}</Text>
                </div>
                <div className="flex items-center gap-1">
                    <Radio name="placementMode" checked={placementMode === MODE_STORED_XY} onCheckedChange={() => setPlacementMode(MODE_STORED_XY)} />
                    <Text>{localizeWithFallback('wiredfurni.params.place_furni.target_location.1', 'Place at coordinates')}</Text>
                </div>
            </div>
            {placementMode === MODE_STORED_XY && (
                <div className="flex gap-2">
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.place_furni.offsets.x', 'X')}</Text>
                        <input
                            className="form-control form-control-sm"
                            type="number"
                            min={0}
                            value={storedX}
                            onChange={(event) => setStoredX(Math.max(0, parseInt(event.target.value, 10) || 0))}
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <Text bold>{localizeWithFallback('wiredfurni.params.place_furni.offsets.y', 'Y')}</Text>
                        <input
                            className="form-control form-control-sm"
                            type="number"
                            min={0}
                            value={storedY}
                            onChange={(event) => setStoredY(Math.max(0, parseInt(event.target.value, 10) || 0))}
                        />
                    </div>
                </div>
            )}
            <div className="flex flex-col gap-1">
                <Text bold>Rotation (0-7)</Text>
                <input
                    className="form-control form-control-sm"
                    type="number"
                    min={0}
                    max={7}
                    value={rotation}
                    onChange={(event) => setRotation(((parseInt(event.target.value, 10) || 0) % 8 + 8) % 8)}
                />
            </div>
        </WiredActionBaseView>
    );
};
