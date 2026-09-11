import { describe, expect, it } from 'vitest';
import {
    applyPathReset,
    createMovingObjectState,
    getMovingObjectImageUrl,
    parseMovingBackgroundObject,
    readMovingBackgroundObjects,
    stepMovingObject
} from './hotelViewMovingObjects';

const bounds = { width: 1172, height: 822 };
const size = { width: 13, height: 25 };

describe('hotelViewMovingObjects', () => {
    it('parses the four official object types from the config string', () => {
        expect(parseMovingBackgroundObject(1, 'cloud;line;-50;100;0.02;0')).toEqual({
            id: 1,
            kind: 'line',
            image: 'cloud',
            startX: -50,
            startY: 100,
            speedX: 0.02,
            speedY: 0
        });
        expect(parseMovingBackgroundObject(2, 'star;spiral;200;0;-0.01;0.001;500;300')).toEqual({
            id: 2,
            kind: 'spiral',
            image: 'star',
            startRadius: 200,
            startAngle: 0,
            speedRadius: -0.01,
            speedAngle: 0.001,
            centerX: 500,
            centerY: 300
        });
        expect(parseMovingBackgroundObject(3, 'splash_;animated;4;8;10;20;1,2')).toEqual({
            id: 3,
            kind: 'animated',
            imageBase: 'splash_',
            frameCount: 4,
            fps: 8,
            x: 10,
            y: 20,
            linkedIds: [1, 2]
        });
        expect(parseMovingBackgroundObject(4, 'reception/bird;randomwalk;0;0;20;0;10;10;500')).toEqual({
            id: 4,
            kind: 'randomwalk',
            image: 'reception/bird',
            startX: 0,
            startY: 0,
            speedX: 20,
            speedY: 0,
            jitterX: 10,
            jitterY: 10,
            intervalMs: 500
        });
        expect(parseMovingBackgroundObject(5, 'x;unknown;1')).toBeNull();
        expect(parseMovingBackgroundObject(6, '')).toBeNull();
        expect(parseMovingBackgroundObject(7, undefined)).toBeNull();
    });

    it('reads the numbered properties, with the timing-code variant when given', () => {
        const props: Record<string, string> = {
            'landing.view.bgobject.1': 'a;line;0;0;1;0',
            'landing.view.bgobject.3': 'b;line;0;0;1;0',
            'landing.view.xmas.bgobject.1': 'c;line;0;0;1;0'
        };

        expect(readMovingBackgroundObjects((key) => props[key]).map((object) => object.id)).toEqual([1, 3]);
        expect(readMovingBackgroundObjects((key) => props[key], 'xmas').map((object) => (object as { image: string }).image)).toEqual(['c']);
    });

    it('resolves the image urls like the official classes', () => {
        expect(getMovingObjectImageUrl(parseMovingBackgroundObject(1, 'cloud;line;0;0;1;0')!, 'http://i/')).toBe('http://i/reception/cloud.png');
        expect(getMovingObjectImageUrl(parseMovingBackgroundObject(1, 'splash_;animated;4;8;0;0;')!, 'http://i/', 2)).toBe('http://i/reception/splash_3.png');
        expect(getMovingObjectImageUrl(parseMovingBackgroundObject(1, 'reception/bird;randomwalk;0;0;1;0;0;0;100')!, 'http://i/')).toBe(
            'http://i/reception/bird.png'
        );
    });

    it('moves a line object and restarts it when it leaves the bounds', () => {
        const config = parseMovingBackgroundObject(1, 'cloud;line;1160;100;0.02;0')!;
        let state = createMovingObjectState(config);

        expect(state).toMatchObject({ x: 1160, y: 100 });

        let step = stepMovingObject(config, state, 100, bounds, size);
        expect(step.pathReset).toBe(false);
        expect(step.state.x).toBeCloseTo(1162);

        state = step.state;
        step = stepMovingObject(config, state, 1000, bounds, size);
        expect(step.pathReset).toBe(true);
        expect(step.state).toMatchObject({ x: 1160, y: 100 });
    });

    it('advances animated frames and restarts them on a linked path reset', () => {
        const config = parseMovingBackgroundObject(2, 'splash_;animated;4;10;0;0;1')!;
        let state = createMovingObjectState(config);

        state = stepMovingObject(config, state, 250, bounds, size).state;
        expect(state.frame).toBe(0);
        state = stepMovingObject(config, state, 250, bounds, size).state;
        expect(state.frame).toBe(2);
        state = stepMovingObject(config, state, 1000, bounds, size).state;
        expect(state.frame).toBe(3);

        expect(applyPathReset(config, state, 5)).toBe(state);
        state = applyPathReset(config, state, 1);
        expect(state.resetAt).toBe(state.elapsed);
        expect(stepMovingObject(config, state, 0, bounds, size).state.frame).toBe(0);
    });

    it('loops the frames of an unlinked animated object', () => {
        const config = parseMovingBackgroundObject(2, 'splash_;animated;2;10;0;0;')!;
        let state = createMovingObjectState(config);

        state = stepMovingObject(config, state, 150, bounds, size).state;
        expect(stepMovingObject(config, state, 0, bounds, size).state.frame).toBe(1);
        state = stepMovingObject(config, state, 100, bounds, size).state;
        expect(stepMovingObject(config, state, 0, bounds, size).state.frame).toBe(0);
    });

    it('random-walks with a deterministic jitter and per-second speeds', () => {
        const config = parseMovingBackgroundObject(3, 'reception/bird;randomwalk;0;0;100;0;10;10;1000')!;
        const state = createMovingObjectState(config);
        const step = stepMovingObject(config, state, 500, bounds, size, () => 1);

        expect(step.pathReset).toBe(false);
        expect(step.state.x).toBeCloseTo(50);
        expect(step.state.y).toBeCloseTo(0);
        expect(step.state.jitterX).toBe(0);
    });

    it('spirals inwards and hides the object at the centre', () => {
        const config = parseMovingBackgroundObject(4, 'star;spiral;100;0;-1;0;500;300')!;
        let state = createMovingObjectState(config);

        expect(state).toMatchObject({ x: 500, y: 400, radius: 100 });
        state = stepMovingObject(config, state, 50, bounds, size).state;
        expect(state.radius).toBe(50);
        expect(state.scale).toBeLessThan(1);

        const step = stepMovingObject(config, state, 60, bounds, size);
        expect(step.pathReset).toBe(true);
        expect(step.state.radius).toBe(100);
    });
});
