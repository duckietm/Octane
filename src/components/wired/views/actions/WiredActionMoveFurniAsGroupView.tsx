import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon } from '../WiredDirectionIcon';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { slotFurniSource } from '../WiredSourceSlots';
import { WiredActionBaseView } from './WiredActionBaseView';
import { Radio } from '../../../../common/Radio';

// Server WiredEffectMoveFurniAsGroup: intParams = [direction (0-7, N/NE/E/SE/S/SW/W/NW), furniSource].
// directionDeltaX/Y handle all 8 compass points, so expose the full grid (was only 0/2/4/6).
export const WiredActionMoveFurniAsGroupView: FC<{}> = () => {
    const { trigger = null, setIntParams = null, setSourceTypes = null } = useWired();
    const [direction, setDirection] = useState(-1);
    const [furniSource, setFurniSource] = useState<number>(() => slotFurniSource(trigger));

    useEffect(() => {
        if (!trigger) return;

        setDirection(trigger.intData.length > 0 ? trigger.intData[0] : -1);

        setFurniSource(slotFurniSource(trigger));
    }, [trigger]);

    // Ours: [direction]; the furni source is the official source slot.
    const save = () => {
        setIntParams([direction]);
        setSourceTypes({ furni: [furniSource], users: [] });
    };

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_OR_BY_TYPE}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={setFurniSource} />}
        >
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
                                    <Radio checked={direction === value} id={`groupdir${value}`} name="groupdir" onCheckedChange={() => setDirection(value)} />
                                    <span className="inline-flex items-center justify-center">
                                        <WiredDirectionIcon direction={value} selected={direction === value} />
                                    </span>
                                </label>
                            );
                        })
                    )}
                </div>
            </div>
        </WiredActionBaseView>
    );
};
