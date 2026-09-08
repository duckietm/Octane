import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { GetConfigurationValue } from '../../api';
import {
    applyPathReset,
    createMovingObjectState,
    getMovingObjectImageUrl,
    MovingBackgroundObjectConfig,
    MovingObjectSize,
    MovingObjectState,
    readMovingBackgroundObjects,
    stepMovingObject
} from './hotelViewMovingObjects';

export interface HotelViewMovingObjectsProps {
    width: number;
    height: number;
}

// The official update receiver runs once per frame; cap a stalled tab's delta
// so objects do not jump across the view when it resumes.
const MAX_FRAME_DELTA_MS = 100;

/**
 * `MovingBackgroundObjects.as`: the `landing.view.bgobject.<n>` objects
 * (1..20) drifting over the landing view background - linear, spiral,
 * random-walk sprites and frame-animated sprites restarted by the path resets
 * of the objects they are linked to.
 */
export const HotelViewMovingObjects: FC<HotelViewMovingObjectsProps> = (props) => {
    const { width, height } = props;
    const imageLibraryUrl = GetConfigurationValue<string>('image.library.url', '');
    const configs = useMemo<MovingBackgroundObjectConfig[]>(() => readMovingBackgroundObjects((key) => GetConfigurationValue<string>(key, '')), []);
    const statesRef = useRef<MovingObjectState[]>(configs.map(createMovingObjectState));
    const sizesRef = useRef<MovingObjectSize[]>(configs.map(() => ({ width: 0, height: 0 })));
    const [, setFrameTick] = useState(0);

    useEffect(() => {
        if (!configs.length) return;

        let lastTime = performance.now();
        let frameId = 0;

        const tick = (now: number) => {
            const delta = Math.min(MAX_FRAME_DELTA_MS, Math.max(0, now - lastTime));
            const resets: number[] = [];

            lastTime = now;
            statesRef.current = configs.map((config, index) => {
                const step = stepMovingObject(config, statesRef.current[index], delta, { width, height }, sizesRef.current[index]);

                if (step.pathReset) resets.push(config.id);

                return step.state;
            });

            if (resets.length) {
                statesRef.current = statesRef.current.map((state, index) =>
                    resets.reduce((current, resetId) => applyPathReset(configs[index], current, resetId), state)
                );
            }

            setFrameTick((value) => value + 1);
            frameId = window.requestAnimationFrame(tick);
        };

        frameId = window.requestAnimationFrame(tick);

        return () => window.cancelAnimationFrame(frameId);
    }, [configs, width, height]);

    if (!configs.length) return null;

    return (
        <div className="hotelview-moving-objects" aria-hidden="true">
            {configs.map((config, index) => {
                const state = statesRef.current[index];

                return (
                    <img
                        key={config.id}
                        className="hotelview-moving-object"
                        src={getMovingObjectImageUrl(config, imageLibraryUrl, state.frame)}
                        alt=""
                        onLoad={(event) => {
                            sizesRef.current[index] = { width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight };
                        }}
                        style={{
                            transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
                            visibility: state.visible ? 'visible' : 'hidden'
                        }}
                    />
                );
            })}
        </div>
    );
};
