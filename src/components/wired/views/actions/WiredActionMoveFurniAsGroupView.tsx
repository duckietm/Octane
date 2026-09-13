import { FC, useEffect, useState } from 'react';
import { LocalizeText, localizeWithFallback, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon } from '../WiredDirectionIcon';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

// Server WiredEffectMoveFurniAsGroup:
// intParams = [direction (0-7, N/NE/E/SE/S/SW/W/NW), furniSource, mode, offsetX, offsetY].
// directionDeltaX/Y handle all 8 compass points, so expose the full grid (was only 0/2/4/6).
const MODE_DIRECTION = 0;
const MODE_OFFSET = 1;

/** Bound of the official offset inputs, mirrored by clampOffset on the server. */
const MAXIMUM_OFFSET = 64;

const clampOffset = (value: number): number => Math.max(-MAXIMUM_OFFSET, Math.min(MAXIMUM_OFFSET, value));

export const WiredActionMoveFurniAsGroupView: FC<{}> = () => {
    const { trigger = null, setIntParams = null } = useWired();
    const [direction, setDirection] = useState(-1);
    const [mode, setMode] = useState(MODE_DIRECTION);
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.intData?.length > 1) return trigger.intData[1];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });

    useEffect(() => {
        if (!trigger) return;

        const data = trigger.intData ?? [];

        setDirection(data.length > 0 ? data[0] : -1);

        if (data.length > 1) setFurniSource(data[1]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);

        setMode(data.length > 2 && data[2] === MODE_OFFSET ? MODE_OFFSET : MODE_DIRECTION);
        setOffsetX(data.length > 3 ? clampOffset(data[3]) : 0);
        setOffsetY(data.length > 4 ? clampOffset(data[4]) : 0);
    }, [trigger]);

    const save = () => setIntParams([direction, furniSource, mode, clampOffset(offsetX), clampOffset(offsetY)]);

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
            <Text>{LocalizeText('wiredfurni.params.move_as_group.usage_info')}</Text>
            <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1">
                    <input
                        checked={mode === MODE_DIRECTION}
                        className="form-check-input"
                        name="groupMoveMode"
                        type="radio"
                        onChange={() => setMode(MODE_DIRECTION)}
                    />
                    <Text>{localizeWithFallback('wiredfurni.params.move_as_group.mode.0', 'One tile in a direction')}</Text>
                </label>
                <label className="flex items-center gap-1">
                    <input
                        checked={mode === MODE_OFFSET}
                        className="form-check-input"
                        name="groupMoveMode"
                        type="radio"
                        onChange={() => setMode(MODE_OFFSET)}
                    />
                    <Text>{localizeWithFallback('wiredfurni.params.move_as_group.mode.1', 'By an X / Y offset')}</Text>
                </label>
            </div>
            {mode === MODE_OFFSET && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.place_furni.offsets')}</Text>
                    <div className="flex items-center gap-2">
                        <Text>{LocalizeText('wiredfurni.params.place_furni.offsets.x')}</Text>
                        <input
                            className="form-control form-control-sm"
                            max={MAXIMUM_OFFSET}
                            min={-MAXIMUM_OFFSET}
                            type="number"
                            value={offsetX}
                            onChange={(event) => setOffsetX(clampOffset(parseInt(event.target.value, 10) || 0))}
                        />
                        <Text>{LocalizeText('wiredfurni.params.place_furni.offsets.y')}</Text>
                        <input
                            className="form-control form-control-sm"
                            max={MAXIMUM_OFFSET}
                            min={-MAXIMUM_OFFSET}
                            type="number"
                            value={offsetY}
                            onChange={(event) => setOffsetY(clampOffset(parseInt(event.target.value, 10) || 0))}
                        />
                    </div>
                </div>
            )}
            {mode === MODE_DIRECTION && (
                <div className="flex flex-col gap-1">
                    <Text bold>{LocalizeText('wiredfurni.params.startdir')}</Text>
                    <div className="grid grid-cols-4 gap-2 max-w-[240px]">
                        {WIRED_DIRECTION_GRID.flatMap((row, rowIndex) =>
                            row.map((value, columnIndex) => {
                                if (value === null) {
                                    return <div key={`group-dir-empty-${rowIndex}-${columnIndex}`} />;
                                }

                                return (
                                    <label key={`group-dir-${value}`} className="flex items-center justify-center gap-[2px] cursor-pointer">
                                        <input
                                            checked={direction === value}
                                            className="form-check-input"
                                            id={`groupdir${value}`}
                                            name="groupdir"
                                            type="radio"
                                            onChange={() => setDirection(value)}
                                        />
                                        <span className="inline-flex items-center justify-center">
                                            <WiredDirectionIcon direction={value} selected={direction === value} />
                                        </span>
                                    </label>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </WiredActionBaseView>
    );
};
