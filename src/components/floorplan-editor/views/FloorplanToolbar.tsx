import { Dispatch, FC } from 'react';
import { FaRedo, FaUndo } from 'react-icons/fa';
import { LocalizeText } from '../../../api';
import { Base } from '../../../common';
import { FloorActionMode, FloorplanAction, FloorplanState } from '../state/types';
import { BaseButton } from '../../../common/BaseButton';

type Props = {
    state: FloorplanState;
    dispatch: Dispatch<FloorplanAction>;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    panMode?: boolean;
    setPanMode?: (next: boolean) => void;
    includeDoor?: boolean;
};

const BRUSH_BUTTONS: { id: string; mode: FloorActionMode; iconClass: string; gap?: boolean }[] = [
    { id: 'tool-set', mode: 'SET', iconClass: 'icon-set-tile' },
    { id: 'tool-unset', mode: 'UNSET', iconClass: 'icon-unset-tile' },
    { id: 'tool-up', mode: 'UP', iconClass: 'icon-increase-height', gap: true },
    { id: 'tool-down', mode: 'DOWN', iconClass: 'icon-decrease-height' },
    { id: 'tool-door', mode: 'DOOR', iconClass: 'icon-set-door', gap: true }
];

export const FloorplanToolbar: FC<Props> = ({ state, dispatch, canUndo, canRedo, onUndo, onRedo, panMode, setPanMode, includeDoor = true }) => {
    const exitPan = () => {
        if (panMode && setPanMode) setPanMode(false);
    };

    const buttons = BRUSH_BUTTONS.filter((button) => includeDoor || button.mode !== 'DOOR');

    return (
        <div className="fp-control-group" data-testid="floorplan-toolbar">
            <div className="fp-group-label">{LocalizeText('floor.plan.editor.draw.mode')}</div>
            <div className="fp-tools">
                {buttons.map((b, index) => {
                    const active = state.brush.action === b.mode && !panMode;

                    return (
                        <Base component={BaseButton} type="button"
                            key={b.id}
                            pointer
                            data-testid={b.id}
                            data-active={active ? 'true' : 'false'}
                            className={`fp-tool ${active ? 'is-active' : ''} ${b.gap && index > 0 ? 'is-gap' : ''}`}
                            onClick={() => {
                                exitPan();
                                dispatch({ type: 'BRUSH_SET', action: b.mode });
                            }}
                        >
                            <span className={`octane-icon ${b.iconClass}`} />
                        </Base>
                    );
                })}
                <Base component={BaseButton} type="button"
                    pointer
                    data-testid="tool-select-all"
                    className="fp-tool is-gap"
                    title={state.brush.action === 'UNSET' ? 'Erase all tiles' : 'Apply brush to all tiles'}
                    onClick={() => {
                        exitPan();
                        dispatch({ type: 'SELECT_ALL' });
                        dispatch({ type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
                    }}
                >
                    <span className={`octane-icon ${state.brush.action === 'UNSET' ? 'icon-set-deselect' : 'icon-set-select'}`} />
                </Base>
                <Base component={BaseButton} type="button"
                    pointer
                    data-testid="tool-square-select"
                    data-active={state.squareSelect && !panMode ? 'true' : 'false'}
                    title={
                        state.squareSelect && !panMode
                            ? 'Rectangular selection mode active — drag on the canvas to apply the brush'
                            : 'Rectangular selection — apply the brush to all tiles in an area'
                    }
                    className={`fp-tool ${state.squareSelect && !panMode ? 'is-active' : ''}`}
                    onClick={() => {
                        exitPan();
                        dispatch({ type: 'SQUARE_SELECT_TOGGLE' });
                    }}
                >
                    <span className="octane-icon icon-set-squaresselect" />
                </Base>
                {setPanMode && (
                    <Base component={BaseButton} type="button"
                        pointer
                        data-testid="tool-pan"
                        data-active={panMode ? 'true' : 'false'}
                        title={panMode ? 'Hand mode active — drag to pan the view' : 'Hand mode — drag to pan the view'}
                        className={`fp-tool is-gap ${panMode ? 'is-active' : ''}`}
                        onClick={() => setPanMode(!panMode)}
                    >
                        <span className="octane-icon icon-hand-mode" />
                    </Base>
                )}
                {(onUndo || onRedo) && (
                    <>
                        <Base component={BaseButton} type="button"
                            pointer={Boolean(canUndo)}
                            data-testid="tool-undo"
                            title="Undo (Ctrl+Z)"
                            className={`fp-tool is-compact is-gap ${canUndo ? '' : 'is-disabled'}`}
                            onClick={canUndo && onUndo ? onUndo : undefined}
                        >
                            <FaUndo size={16} />
                        </Base>
                        <Base component={BaseButton} type="button"
                            pointer={Boolean(canRedo)}
                            data-testid="tool-redo"
                            title="Redo (Ctrl+Shift+Z)"
                            className={`fp-tool is-compact ${canRedo ? '' : 'is-disabled'}`}
                            onClick={canRedo && onRedo ? onRedo : undefined}
                        >
                            <FaRedo size={16} />
                        </Base>
                    </>
                )}
            </div>
        </div>
    );
};
