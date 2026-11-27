import { FC, ReactNode } from 'react';
import { FaArrowUp, FaRedoAlt, FaUndoAlt } from 'react-icons/fa';
import { LocalizeText, localizeWithFallback } from '../../../../../api';
import { BaseButton, NumberInput, NumberInputProps } from '../../../../../common';
import { HandheldInfoDrawer } from '../../../../../common/handheld/HandheldInfoDrawer';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';

/** The four tile steps, as the room shows them on screen: [id, dx, dy, text key, fallback]. */
const MOVES: [id: string, deltaX: number, deltaY: number, key: string, fallback: string][] = [
    ['up-left', -1, 0, 'octane.handheld.buildtools.move.up_left', 'Move up-left'],
    ['up-right', 0, -1, 'octane.handheld.buildtools.move.up_right', 'Move up-right'],
    ['down-left', 0, 1, 'octane.handheld.buildtools.move.down_left', 'Move down-left'],
    ['down-right', 1, 0, 'octane.handheld.buildtools.move.down_right', 'Move down-right']
];

/** Height steps: a whole tile, a tenth, a hundredth. */
export const HANDHELD_BUILD_HEIGHT_STEPS = [1, 0.1, 0.01];

interface HandheldBuildToolsViewProps {
    title: string;
    picture?: ReactNode;
    /** The furni's height; null while the field is being typed in. */
    height: number | null;
    onMove: (deltaX: number, deltaY: number) => void;
    /** 1 turns clockwise, -1 the other way. */
    onRotate: (direction: 1 | -1) => void;
    onHeightStep: (amount: number) => void;
    onHeightChange: NumberInputProps['onChange'];
    onHeightBlur: NumberInputProps['onBlur'];
    /** Back to the furni's drawer. */
    onBack: () => void;
    onClose: () => void;
}

/**
 * The build tools on a phone: one low panel over the toolbar with nothing but the controls (tile steps, turning,
 * height), so the furni being moved stays in view in the room above it. It replaces the furni's drawer while
 * it is up; Back returns to it.
 */
export const HandheldBuildToolsView: FC<HandheldBuildToolsViewProps> = ({
    title,
    picture = null,
    height,
    onMove,
    onRotate,
    onHeightStep,
    onHeightChange,
    onHeightBlur,
    onBack,
    onClose
}) => {
    const heightLabel = LocalizeText('stack.magic.tile.height.label');

    return (
        <NativeTextTree>
            <HandheldInfoDrawer
                details={
                    <div className="octane-handheld-build">
                        <section className="octane-handheld-build__group" data-group="move">
                            <h3 className="octane-handheld-build__label">{LocalizeText('group.edit.badge.position')}</h3>
                            <div className="octane-handheld-build__pad">
                                {MOVES.map(([id, deltaX, deltaY, key, fallback]) => (
                                    <BaseButton
                                        key={id}
                                        aria-label={localizeWithFallback(key, fallback)}
                                        className="octane-handheld-build__key"
                                        data-move={id}
                                        onClick={() => onMove(deltaX, deltaY)}
                                    >
                                        <FaArrowUp aria-hidden="true" />
                                    </BaseButton>
                                ))}
                            </div>
                        </section>
                        <section className="octane-handheld-build__group" data-group="turn">
                            <h3 className="octane-handheld-build__label">{LocalizeText('infostand.button.rotate')}</h3>
                            <div className="octane-handheld-build__turn">
                                <BaseButton
                                    aria-label={localizeWithFallback('octane.handheld.buildtools.rotate.left', 'Turn left')}
                                    className="octane-handheld-build__key"
                                    data-turn="left"
                                    onClick={() => onRotate(-1)}
                                >
                                    <FaUndoAlt aria-hidden="true" />
                                </BaseButton>
                                <BaseButton
                                    aria-label={localizeWithFallback('octane.handheld.buildtools.rotate.right', 'Turn right')}
                                    className="octane-handheld-build__key"
                                    data-turn="right"
                                    onClick={() => onRotate(1)}
                                >
                                    <FaRedoAlt aria-hidden="true" />
                                </BaseButton>
                            </div>
                        </section>
                        <section className="octane-handheld-build__group" data-group="height">
                            <div className="octane-handheld-build__height-head">
                                <h3 className="octane-handheld-build__label">{heightLabel}</h3>
                                <NumberInput
                                    aria-label={heightLabel}
                                    className="octane-handheld-build__field"
                                    max={40}
                                    min={0}
                                    spellCheck={false}
                                    step={0.1}
                                    steppers={false}
                                    value={height !== null ? height.toString() : ''}
                                    onBlur={onHeightBlur}
                                    onChange={onHeightChange}
                                />
                            </div>
                            <div className="octane-handheld-build__steps">
                                {HANDHELD_BUILD_HEIGHT_STEPS.map((step) => (
                                    <BaseButton key={`up-${step}`} className="octane-handheld-build__key" data-step="up" onClick={() => onHeightStep(step)}>
                                        {`+${step}`}
                                    </BaseButton>
                                ))}
                                {HANDHELD_BUILD_HEIGHT_STEPS.map((step) => (
                                    <BaseButton
                                        key={`down-${step}`}
                                        className="octane-handheld-build__key"
                                        data-step="down"
                                        onClick={() => onHeightStep(-step)}
                                    >
                                        {`-${step}`}
                                    </BaseButton>
                                ))}
                            </div>
                        </section>
                    </div>
                }
                label={localizeWithFallback('octane.handheld.buildtools.title', 'Build tools')}
                picture={picture}
                subtitle={localizeWithFallback('octane.handheld.buildtools.title', 'Build tools')}
                title={title}
                onBack={onBack}
                onClose={onClose}
            />
        </NativeTextTree>
    );
};
