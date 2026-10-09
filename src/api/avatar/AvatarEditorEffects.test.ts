import { describe, expect, it } from 'vitest';
import { getAvatarEffectTimeLeftText } from './AvatarEditorEffects';

describe('avatar editor effect time left', () => {
    it('follows the official permanent / days / clock texts', () => {
        expect(getAvatarEffectTimeLeftText(10, true)).toEqual({ key: 'avatareditor.effects.active.permanent' });
        expect(getAvatarEffectTimeLeftText(3 * 86400 + 5, false)).toEqual({ key: 'avatareditor.effects.active.daysleft', parameter: 'days_left', value: '3' });
        expect(getAvatarEffectTimeLeftText(3725, false).value).toBe('01:02:05');
        expect(getAvatarEffectTimeLeftText(65, false).value).toBe('01:05');
    });
});
