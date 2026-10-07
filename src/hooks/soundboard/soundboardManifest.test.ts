import { describe, expect, it } from 'vitest';
import { normalizeSoundboardManifest } from './soundboardManifest';
import { soundboardPlayOptions } from './soundboardPresentation';

const manifestOf = (...pads: Record<string, unknown>[]) =>
    normalizeSoundboardManifest({ soundboard: pads.map((pad) => ({ classname: 'bell', file: 'bell.ogg', ...pad })) }).byClassname.get('bell');

describe('soundboard manifest group and gain', () => {
    it('reads the group and the gain of a pad', () => {
        expect(manifestOf({ group: 'Bells', gain: 0.5 })).toMatchObject({ group: 'bells', gain: 0.5 });
    });

    it('leaves a pad without a group and at full level when the manifest says nothing', () => {
        expect(manifestOf({})).toMatchObject({ group: '', gain: 1 });
    });

    it('ignores a group that is not a plain name and a gain outside the range', () => {
        expect(manifestOf({ group: 'not a name!', gain: 0 })).toMatchObject({ group: '', gain: 1 });
        expect(manifestOf({ group: 7, gain: 3 })).toMatchObject({ group: '', gain: 1 });
        expect(manifestOf({ gain: '0.5' })).toMatchObject({ gain: 1 });
    });
});

describe('soundboard play options', () => {
    it('hands the group and the gain to the sound manager', () => {
        expect(soundboardPlayOptions({ group: 'bells', gain: 0.5 })).toEqual({ group: 'bells', gain: 0.5 });
    });

    it('reports an empty group as none and a pad that is unknown as no options', () => {
        expect(soundboardPlayOptions({ group: '', gain: 1 })).toEqual({ group: undefined, gain: 1 });
        expect(soundboardPlayOptions(undefined)).toBeUndefined();
        expect(soundboardPlayOptions(null)).toBeUndefined();
    });
});
