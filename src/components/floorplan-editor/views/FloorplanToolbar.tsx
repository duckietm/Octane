import { Dispatch, FC } from 'react';
import { FaHandPaper, FaRedo, FaUndo } from 'react-icons/fa';
import { LocalizeText } from '../../../api';
import { Base, Flex, Text } from '../../../common';
import { FloorActionMode, FloorplanAction, FloorplanState } from '../state/types';

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

const BRUSH_BUTTONS: { id: string; mode: FloorActionMode; iconClass: string }[] = [
    { id: 'tool-set', mode: 'SET', iconClass: 'icon-set-tile' },
    { id: 'tool-unset', mode: 'UNSET', iconClass: 'icon-unset-tile' },
    { id: 'tool-up', mode: 'UP', iconClass: 'icon-increase-height' },
    { id: 'tool-down', mode: 'DOWN', iconClass: 'icon-decrease-height' },
    { id: 'tool-door', mode: 'DOOR', iconClass: 'icon-set-door' }
];

export const FloorplanToolbar: FC<Props> = ({ state, dispatch, canUndo, canRedo, onUndo, onRedo, panMode, setPanMode, includeDoor = true }) => {
    const exitPan = () => {
        if (panMode && setPanMode) setPanMode(false);
    };

    return (
        <Flex gap={1} alignItems="center">
            <Text bold small>
                {LocalizeText('floor.plan.editor.draw.mode')}
            </Text>
            {setPanMode && (
                <Base
                    pointer
                    data-testid="tool-pan"
                    data-active={panMode ? 'true' : 'false'}
                    title={panMode ? 'Hand mode active — drag to pan the view' : 'Hand mode — drag to pan the view'}
                    className={`w-7 h-7 flex items-center justify-center rounded border ${panMode ? 'bg-emerald-500 border-emerald-700 text-white shadow-inner' : 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700'}`}
                    onClick={() => setPanMode(!panMode)}
                >
                    <FaHandPaper size={12} />
                </Base>
            )}
            {BRUSH_BUTTONS.filter((button) => includeDoor || button.mode !== 'DOOR').map((b) => {
                const active = state.brush.action === b.mode && !panMode;

                return (
                    <Base
                        key={b.id}
                        pointer
                        data-testid={b.id}
                        data-active={active ? 'true' : 'false'}
                        className={`octane-icon ${b.iconClass} ${active ? 'border border-primary' : ''}`}
                        onClick={() => {
                            exitPan();
                            dispatch({ type: 'BRUSH_SET', action: b.mode });
                        }}
                    />
                );
            })}
            <Base
                pointer
                data-testid="tool-select-all"
                className={`octane-icon ${state.brush.action === 'UNSET' ? 'icon-set-deselect' : 'icon-set-select'}`}
                title={state.brush.action === 'UNSET' ? 'Erase all tiles' : 'Apply brush to all tiles'}
                onClick={() => {
                    exitPan();
                    dispatch({ type: 'SELECT_ALL' });
                    dispatch({ type: 'APPLY_BRUSH_TO_SELECTION', source: 'local' });
                }}
            />
            <Base
                pointer
                data-testid="tool-square-select"
                data-active={state.squareSelect && !panMode ? 'true' : 'false'}
                title={
                    state.squareSelect && !panMode
                        ? 'Rectangular selection mode active — drag on the canvas to apply the brush'
                        : 'Rectangular selection — apply the brush to all tiles in an area'
                }
                className={`octane-icon icon-set-squaresselect transition-shadow ${state.squareSelect && !panMode ? 'border-2 border-amber-500 bg-amber-400 shadow-[0_0_0_2px_rgba(245,158,11,0.45)]' : ''}`}
                onClick={() => {
                    exitPan();
                    dispatch({ type: 'SQUARE_SELECT_TOGGLE' });
                }}
            />
            {(onUndo || onRedo) && (
                <Flex gap={1} alignItems="center" className="ml-2 pl-2 border-l border-zinc-300">
                    <Base
                        pointer={Boolean(canUndo)}
                        data-testid="tool-undo"
                        title="Undo (Ctrl+Z)"
                        className={`w-7 h-7 flex items-center justify-center rounded border ${canUndo ? 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700' : 'border-zinc-200 bg-zinc-100 text-zinc-300 cursor-not-allowed'}`}
                        onClick={canUndo && onUndo ? onUndo : undefined}
                    >
                        <FaUndo size={12} />
                    </Base>
                    <Base
                        pointer={Boolean(canRedo)}
                        data-testid="tool-redo"
                        title="Redo (Ctrl+Shift+Z)"
                        className={`w-7 h-7 flex items-center justify-center rounded border ${canRedo ? 'border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700' : 'border-zinc-200 bg-zinc-100 text-zinc-300 cursor-not-allowed'}`}
                        onClick={canRedo && onRedo ? onRedo : undefined}
                    >
                        <FaRedo size={12} />
                    </Base>
                </Flex>
            )}
        </Flex>
    );
};
