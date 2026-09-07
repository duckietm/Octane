import { FC, useEffect, useState } from 'react';
import { LocalizeText, WiredFurniType } from '../../../../api';
import iconWiredDirE from '../../../../assets/images/wired/icon_wired_dir_e.png';
import iconWiredDirHorizontalRandom from '../../../../assets/images/wired/icon_wired_dir_horizontal_random.png';
import iconWiredDirN from '../../../../assets/images/wired/icon_wired_dir_n.png';
import iconWiredDirNe from '../../../../assets/images/wired/icon_wired_dir_ne.png';
import iconWiredDirNw from '../../../../assets/images/wired/icon_wired_dir_nw.png';
import iconWiredDirRandom from '../../../../assets/images/wired/icon_wired_dir_random.png';
import iconWiredDirS from '../../../../assets/images/wired/icon_wired_dir_s.png';
import iconWiredDirSe from '../../../../assets/images/wired/icon_wired_dir_se.png';
import iconWiredDirSw from '../../../../assets/images/wired/icon_wired_dir_sw.png';
import iconWiredDirVerticalRandom from '../../../../assets/images/wired/icon_wired_dir_vertical_random.png';
import iconWiredDirW from '../../../../assets/images/wired/icon_wired_dir_w.png';
import { Text } from '../../../../common';
import { useWired } from '../../../../hooks';
import { WIRED_DIRECTION_GRID, WiredDirectionIcon } from '../WiredDirectionIcon';
import { WiredSourcesSelector } from '../WiredSourcesSelector';
import { WiredActionBaseView } from './WiredActionBaseView';

const NORMAL_DIRECTION_VALUE_MAP: Record<number, { value: number; icon: string }> = {
    0: { value: 6, icon: iconWiredDirN },
    1: { value: 8, icon: iconWiredDirNe },
    2: { value: 5, icon: iconWiredDirE },
    3: { value: 9, icon: iconWiredDirSe },
    4: { value: 4, icon: iconWiredDirS },
    5: { value: 10, icon: iconWiredDirSw },
    6: { value: 7, icon: iconWiredDirW },
    7: { value: 11, icon: iconWiredDirNw }
};

const extraDirectionOptions: { value: number; icon: string }[] = [
    {
        value: 1,
        icon: iconWiredDirRandom
    },
    {
        value: 2,
        icon: iconWiredDirHorizontalRandom
    },
    {
        value: 3,
        icon: iconWiredDirVerticalRandom
    }
];

const rotationOptions: number[] = [0, 1, 2, 3];

export const WiredActionMoveFurniView: FC<{}> = (props) => {
    const [movement, setMovement] = useState(-1);
    const [rotation, setRotation] = useState(-1);
    const { trigger = null, setIntParams = null } = useWired();
    const [furniSource, setFurniSource] = useState<number>(() => {
        if (trigger?.intData?.length > 2) return trigger.intData[2];
        return (trigger?.selectedItems?.length ?? 0) > 0 ? 100 : 0;
    });

    const save = () => setIntParams([movement, rotation, furniSource]);

    useEffect(() => {
        if (trigger.intData.length >= 2) {
            setMovement(trigger.intData[0]);
            setRotation(trigger.intData[1]);
        } else {
            setMovement(-1);
            setRotation(-1);
        }

        if (trigger.intData.length > 2) setFurniSource(trigger.intData[2]);
        else setFurniSource((trigger.selectedItems?.length ?? 0) > 0 ? 100 : 0);
    }, [trigger]);

    const onChangeFurniSource = (next: number) => setFurniSource(next);

    const requiresFurni = WiredFurniType.STUFF_SELECTION_OPTION_BY_ID_BY_TYPE_OR_FROM_CONTEXT;

    return (
        <WiredActionBaseView
            hasSpecialInput={true}
            requiresFurni={requiresFurni}
            save={save}
            footer={<WiredSourcesSelector showFurni={true} furniSource={furniSource} onChangeFurni={onChangeFurniSource} />}
        >
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.movefurni')}</Text>
                <div className="flex items-center gap-1">
                    <input
                        checked={movement === 0}
                        className="form-check-input"
                        id="movement0"
                        name="selectedTeam"
                        type="radio"
                        onChange={(event) => setMovement(0)}
                    />
                    <Text>{LocalizeText('wiredfurni.params.movefurni.0')}</Text>
                </div>
                <div className="grid grid-cols-4 gap-2 max-w-[240px]">
                    {WIRED_DIRECTION_GRID.flatMap((row, rowIndex) =>
                        row.map((direction, columnIndex) => {
                            if (direction === null) {
                                return <div key={`move-furni-empty-${rowIndex}-${columnIndex}`} />;
                            }

                            const option = NORMAL_DIRECTION_VALUE_MAP[direction];

                            return (
                                <label key={`move-furni-${direction}`} className="flex items-center justify-center gap-[2px] cursor-pointer">
                                    <input
                                        checked={movement === option.value}
                                        className="form-check-input"
                                        id={`movement${option.value}`}
                                        name="movement"
                                        type="radio"
                                        onChange={(event) => setMovement(option.value)}
                                    />
                                    <span className="inline-flex items-center justify-center">
                                        <WiredDirectionIcon direction={option.value} iconSrc={option.icon} selected={movement === option.value} />
                                    </span>
                                </label>
                            );
                        })
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {extraDirectionOptions.map((option) => {
                        return (
                            <label key={`extra-${option.value}`} className="flex items-center gap-[2px] cursor-pointer">
                                <input
                                    checked={movement === option.value}
                                    className="form-check-input"
                                    id={`movement${option.value}`}
                                    name="movement"
                                    type="radio"
                                    onChange={(event) => setMovement(option.value)}
                                />
                                <span className="inline-flex items-center justify-center">
                                    <WiredDirectionIcon direction={option.value} iconSrc={option.icon} selected={movement === option.value} />
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>
            <div className="flex flex-col gap-1">
                <Text bold>{LocalizeText('wiredfurni.params.rotatefurni')}</Text>
                {rotationOptions.map((option) => {
                    return (
                        <div key={option} className="flex items-center gap-1">
                            <input
                                checked={rotation === option}
                                className="form-check-input"
                                id={`rotation${option}`}
                                name="rotation"
                                type="radio"
                                onChange={(event) => setRotation(option)}
                            />
                            <Text>
                                {[1, 2].includes(option) && <i className={`octane-icon icon-rot-${option}`} />}
                                {LocalizeText(`wiredfurni.params.rotatefurni.${option}`)}
                            </Text>
                        </div>
                    );
                })}
            </div>
        </WiredActionBaseView>
    );
};
