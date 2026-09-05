import { BuildHeightAvailableEvent, SetBuildHeightComposer } from '@octane/renderer';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import { SendMessageComposer } from '../../api';
import { useMessageEvent } from '../events';

const HEIGHT_SCALE = 100;

const THROTTLE_MS = 150;

const useBuildHeightState = () => {
    const [available, setAvailable] = useState(false);
    const [minHeight, setMinHeight] = useState(-40);
    const [maxHeight, setMaxHeight] = useState(40);
    const [isOpen, setIsOpen] = useState(false);
    const [height, setHeight] = useState(0);

    const lastSentRef = useRef(0);
    const trailingRef = useRef<number | null>(null);

    const cancelTrailing = useCallback(() => {
        if (trailingRef.current !== null) {
            window.clearTimeout(trailingRef.current);
            trailingRef.current = null;
        }
    }, []);

    const sendHeight = useCallback((value: number) => {
        lastSentRef.current = Date.now();
        SendMessageComposer(new SetBuildHeightComposer(true, Math.round(value * HEIGHT_SCALE)));
    }, []);

    useMessageEvent<BuildHeightAvailableEvent>(BuildHeightAvailableEvent, event => {
        const parser = event.getParser();

        setAvailable(parser.available);
        setMinHeight(parser.minHeight);
        setMaxHeight(parser.maxHeight);

        cancelTrailing();
        setIsOpen(false);
        setHeight(0);
    });

    const applyHeight = useCallback((value: number) => {
        setHeight(value);
        cancelTrailing();

        const elapsed = Date.now() - lastSentRef.current;

        if (elapsed >= THROTTLE_MS) {
            sendHeight(value);
        } else {
            trailingRef.current = window.setTimeout(() => {
                trailingRef.current = null;
                sendHeight(value);
            }, THROTTLE_MS - elapsed);
        }
    }, [cancelTrailing, sendHeight]);

    const open = useCallback(() => setIsOpen(true), []);

    const close = useCallback(() => {
        cancelTrailing();
        setIsOpen(false);
        setHeight(0);
        lastSentRef.current = Date.now();
        SendMessageComposer(new SetBuildHeightComposer(false, 0));
    }, [cancelTrailing]);

    const toggle = useCallback(() => {
        if (isOpen) close();
        else open();
    }, [isOpen, close, open]);

    useEffect(() => cancelTrailing, [cancelTrailing]);

    return { available, minHeight, maxHeight, isOpen, height, applyHeight, open, close, toggle };
};

export const useBuildHeight = () => useSharedHook(useBuildHeightState);

registerSharedHook(useBuildHeightState);
