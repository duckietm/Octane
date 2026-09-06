import { Dispatch, FC } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { LocalizeText } from '../../../api';
import { Base, Flex, Text } from '../../../common';
import { EntryDir, FloorplanAction, FloorplanState, ThicknessLevel } from '../state/types';

type Props = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
};

const THICKNESS_LEVELS: ThicknessLevel[] = [0, 1, 2, 3];
const THICKNESS_NAMES = ['thinnest', 'thin', 'normal', 'thick'] as const;

const rotateDir = (dir: EntryDir, step: 1 | -1): EntryDir => ((dir + step + 8) & 7) as EntryDir;

export const FloorplanOptionsPanel: FC<Props> = ({ state, dispatch }) => {
    const setDir = (next: EntryDir) => dispatch({ type: 'SET_DOOR_DIR', dir: next, source: 'local' });
    const setWall = (t: ThicknessLevel) => dispatch({ type: 'SET_THICKNESS', wall: t, source: 'local' });
    const setFloor = (t: ThicknessLevel) => dispatch({ type: 'SET_THICKNESS', floor: t, source: 'local' });

    return (
        <Flex gap={3} alignItems="center" className="py-1">
            <Flex gap={1} alignItems="center">
                <Text bold small className="text-zinc-700">
                    {LocalizeText('floor.plan.editor.enter.direction')}
                </Text>
                <Flex alignItems="center" gap={0} className="rounded border border-zinc-300 bg-white overflow-hidden">
                    <Base
                        data-testid="entry-dir-prev"
                        pointer
                        title="Rotate left"
                        className="w-7 h-9 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                        onClick={() => setDir(rotateDir(state.door.dir, -1))}
                    >
                        <FaChevronLeft size={12} />
                    </Base>
                    <Base
                        data-testid="entry-dir"
                        pointer
                        title={`Direction ${state.door.dir}/7 (click to rotate)`}
                        className={`octane-icon icon-door-direction-${state.door.dir} mx-1`}
                        onClick={() => setDir(rotateDir(state.door.dir, 1))}
                    />
                    <Base
                        data-testid="entry-dir-next"
                        pointer
                        title="Rotate right"
                        className="w-7 h-9 flex items-center justify-center text-zinc-600 hover:bg-zinc-100"
                        onClick={() => setDir(rotateDir(state.door.dir, 1))}
                    >
                        <FaChevronRight size={12} />
                    </Base>
                </Flex>
            </Flex>

            <ThicknessSegmented
                label="Walls"
                value={state.thickness.wall}
                onChange={setWall}
                testIdPrefix="wall-thickness"
                labelKeyPrefix="navigator.roomsettings.wall_thickness"
            />

            <ThicknessSegmented
                label="Floors"
                value={state.thickness.floor}
                onChange={setFloor}
                testIdPrefix="floor-thickness"
                labelKeyPrefix="navigator.roomsettings.floor_thickness"
            />
        </Flex>
    );
};

type SegmentedProps = {
    label: string;
    value: ThicknessLevel;
    onChange: (next: ThicknessLevel) => void;
    testIdPrefix: string;
    labelKeyPrefix: string;
};

const ThicknessSegmented: FC<SegmentedProps> = ({ label, value, onChange, testIdPrefix, labelKeyPrefix }) => {
    return (
        <Flex gap={1} alignItems="center">
            <Text bold small className="text-zinc-700">
                {label}
            </Text>
            <Flex className="rounded border border-zinc-300 bg-white overflow-hidden">
                {THICKNESS_LEVELS.map((t) => {
                    const active = value === t;

                    return (
                        <Base
                            key={`${testIdPrefix}-${t}`}
                            data-testid={`${testIdPrefix}-${t}`}
                            pointer
                            title={LocalizeText(`${labelKeyPrefix}.${THICKNESS_NAMES[t]}`)}
                            className={`px-2 h-9 flex items-center justify-center text-xs ${active ? 'bg-emerald-500 text-white font-bold' : 'text-zinc-700 hover:bg-zinc-100'} ${t < THICKNESS_LEVELS.length - 1 ? 'border-r border-zinc-300' : ''}`}
                            onClick={() => onChange(t)}
                        >
                            {LocalizeText(`${labelKeyPrefix}.${THICKNESS_NAMES[t]}`)}
                        </Base>
                    );
                })}
            </Flex>
        </Flex>
    );
};
