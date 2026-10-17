import { Dispatch, FC } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { LocalizeText } from '../../../api';
import { localizeOr } from '../state/localize';
import { Base } from '../../../common';
import { EntryDir, FloorplanAction, FloorplanState, ThicknessLevel } from '../state/types';
import { BaseButton } from '../../../common/BaseButton';

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
        <>
            <div className="fp-control-group is-centered" data-testid="floorplan-orientation">
                <div className="fp-group-label">{LocalizeText('floor.plan.editor.enter.direction')}</div>
                <div className="fp-orientation">
                    <Base component={BaseButton} type="button" data-testid="entry-dir-prev" pointer title="Rotate left" className="fp-orientation-step" onClick={() => setDir(rotateDir(state.door.dir, -1))}>
                        <FaChevronLeft size={11} />
                    </Base>
                    <Base component={BaseButton} type="button"
                        data-testid="entry-dir"
                        pointer
                        title={`Direction ${state.door.dir}/7 (click to rotate)`}
                        className={`octane-icon icon-door-direction-${state.door.dir}`}
                        onClick={() => setDir(rotateDir(state.door.dir, 1))}
                    />
                    <Base component={BaseButton} type="button" data-testid="entry-dir-next" pointer title="Rotate right" className="fp-orientation-step" onClick={() => setDir(rotateDir(state.door.dir, 1))}>
                        <FaChevronRight size={11} />
                    </Base>
                </div>
            </div>

            <div className="fp-control-group is-centered is-right" data-testid="floorplan-appearance">
                <div className="fp-group-label">{localizeOr('floor.plan.editor.appearance', 'Appearance')}</div>
                <ThicknessStepper value={state.thickness.wall} onChange={setWall} testIdPrefix="wall-thickness" labelKeyPrefix="navigator.roomsettings.wall_thickness" />
                <ThicknessStepper value={state.thickness.floor} onChange={setFloor} testIdPrefix="floor-thickness" labelKeyPrefix="navigator.roomsettings.floor_thickness" />
            </div>
        </>
    );
};

type StepperProps = {
    value: ThicknessLevel;
    onChange: (next: ThicknessLevel) => void;
    testIdPrefix: string;
    labelKeyPrefix: string;
};

/** Up steps to the next thicker level, down to the thinner one; the label cycles on click. */
const ThicknessStepper: FC<StepperProps> = ({ value, onChange, testIdPrefix, labelKeyPrefix }) => {
    const index = THICKNESS_LEVELS.indexOf(value);
    const thinner = index > 0 ? THICKNESS_LEVELS[index - 1] : null;
    const thicker = index < THICKNESS_LEVELS.length - 1 ? THICKNESS_LEVELS[index + 1] : null;
    const label = LocalizeText(`${labelKeyPrefix}.${THICKNESS_NAMES[value]}`);

    return (
        <div className="fp-select" data-testid={testIdPrefix} data-value={value} title={label}>
            <BaseButton className="cursor-pointer" data-testid={`${testIdPrefix}-label`} type="button" onClick={() => onChange(thicker ?? THICKNESS_LEVELS[0])}>
                {label}
            </BaseButton>
            <div className="fp-select-arrows">
                <BaseButton
                    aria-disabled={thicker === null}
                    aria-label="Thicker"
                    data-testid={`${testIdPrefix}-up`}
                    className={`fp-select-arrow is-up ${thicker === null ? 'is-disabled' : ''}`}
                    title="Thicker"
                    type="button"
                    onClick={() => thicker !== null && onChange(thicker)}
                />
                <BaseButton
                    aria-disabled={thinner === null}
                    aria-label="Thinner"
                    data-testid={`${testIdPrefix}-down`}
                    className={`fp-select-arrow is-down ${thinner === null ? 'is-disabled' : ''}`}
                    title="Thinner"
                    type="button"
                    onClick={() => thinner !== null && onChange(thinner)}
                />
            </div>
        </div>
    );
};
