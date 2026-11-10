import { describe, expect, it, vi } from 'vitest';
import { confirmCompostPlant } from './confirmCompostPlant';

describe('compost confirmation', () => {
    it('composts only after the confirmation', () => {
        const showConfirm = vi.fn();
        const compost = vi.fn();

        confirmCompostPlant(showConfirm, compost);

        expect(compost).not.toHaveBeenCalled();
        expect(showConfirm).toHaveBeenCalledTimes(1);
        expect(showConfirm.mock.calls[0][5]).toBe('Compost your plant');

        showConfirm.mock.calls[0][1]();

        expect(compost).toHaveBeenCalledTimes(1);
    });
});
