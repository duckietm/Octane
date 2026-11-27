import { FC, useLayoutEffect, useRef, useState } from 'react';
import { DraggableWindow } from '../../../common/draggable-window';
import { NativeText } from '../../../common/native-text/NativeText';
import { Native3Frame, Native3ThickButton } from '../native/NativeWindow3';

const BODY_COLOR = 0xe9e9e1;
const WIDTH = 278;

interface ModConfirmViewProps {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * A confirmation in the style 3 alert window (habbo_window_alert geometry): the summary at (27, 14), 210 wide, and the two thick buttons under it.
 * Ban, kick, mute and trade lock cannot be undone from the mod tools, so the mod action window names who and what here before anything is sent.
 */
export const ModConfirmView: FC<ModConfirmViewProps> = ({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel }) => {
    const summaryRef = useRef<HTMLDivElement>(null);
    const [summaryHeight, setSummaryHeight] = useState(57);

    useLayoutEffect(() => {
        const element = summaryRef.current;

        if (!element || typeof ResizeObserver === 'undefined') return;

        const measure = () => setSummaryHeight(Math.max(57, element.offsetHeight));

        measure();

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => observer.disconnect();
    }, [message]);

    const height = 141 + (summaryHeight - 57);
    const buttonY = 81 + (summaryHeight - 57);

    return (
        <DraggableWindow handleSelector=".native3-title" initialPosition={{ x: Math.round((window.innerWidth - WIDTH) / 2), y: Math.round((window.innerHeight - height) / 2) }}>
            <Native3Frame height={height} title={title} width={WIDTH} onClose={onCancel}>
                <div ref={summaryRef} style={{ position: 'absolute', left: 27, top: 14, width: 210 }}>
                    <NativeText background={BODY_COLOR} maxWidth={210} text={message} textStyle="u_regular" />
                </div>
                <Native3ThickButton height={24} label={cancelLabel} width={100} x={26} y={buttonY} onClick={onCancel} />
                <Native3ThickButton height={24} label={confirmLabel} width={100} x={141} y={buttonY} onClick={onConfirm} />
            </Native3Frame>
        </DraggableWindow>
    );
};
