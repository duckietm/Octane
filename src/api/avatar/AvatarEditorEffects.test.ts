import { describe, expect, it } from 'vitest';
import { getAvatarEffectDurationText, getAvatarEffectTimeLeftText } from './AvatarEditorEffects';

describe('avatar editor effect time left', () => {
    it('follows the official permanent / days / clock texts', () => {
        expect(getAvatarEffectTimeLeftText(10, true)).toEqual({ key: 'avatareditor.effects.active.permanent' });
        expect(getAvatarEffectTimeLeftText(3 * 86400 + 5, false)).toEqual({ key: 'avatareditor.effects.active.daysleft', parameter: 'days_left', value: '3' });
        expect(getAvatarEffectTimeLeftText(3725, false).value).toBe('01:02:05');
        expect(getAvatarEffectTimeLeftText(65, false).value).toBe('01:05');
    });
});

describe('catalog effect offer duration', () => {
    it('reads the seconds the emulator sends', () => {
        expect(getAvatarEffectDurationText('0').key).toBe('catalog.effect.duration.permanent');
        expect(getAvatarEffectDurationText('86400')).toMatchObject({ key: 'catalog.effect.duration.days', value: '1' });
        expect(getAvatarEffectDurationText('604800').value).toBe('7');
        expect(getAvatarEffectDurationText('3600')).toMatchObject({ key: 'catalog.effect.duration.hours', value: '1' });
        expect(getAvatarEffectDurationText('900')).toMatchObject({ key: 'catalog.effect.duration.minutes', value: '15' });
        expect(getAvatarEffectDurationText('')).toBeNull();
        expect(getAvatarEffectDurationText(null)).toBeNull();
        expect(getAvatarEffectDurationText('poster')).toBeNull();
    });
});
