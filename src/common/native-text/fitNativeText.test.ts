import { describe, expect, it } from 'vitest';
import { fitNativeText } from './fitNativeText';

// Every character 5 px wide.
const measure = (text: string) => text.length * 5;

describe('fitNativeText', () => {
    it('keeps text that fits', () => {
        expect(fitNativeText('Normale muren', 65, measure)).toBe('Normale muren');
    });

    it('cuts text that does not fit and ends it in dots', () => {
        expect(fitNativeText('Normale muren', 50, measure)).toBe('Normale...');
    });

    it('drops the space before the dots', () => {
        expect(fitNativeText('Free Flow style', 40, measure)).toBe('Free...');
    });

    it('leaves only the dots when nothing else fits', () => {
        expect(fitNativeText('Normale muren', 10, measure)).toBe('...');
    });
});
