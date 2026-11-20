import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./NativeFont', () => ({
    peekNativeFont: () => ({ font: {} }),
    loadNativeFont: vi.fn(),
    // Every character is 6 px wide.
    measureNativeText: (_font: unknown, text: string) => text.length * 6
}));

import { useFittedNativeText } from './useFittedNativeText';

describe('useFittedNativeText', () => {
    it('leaves a caption that fits as it is', () => {
        const { result } = renderHook(() => useFittedNativeText('User info: Frank', 'il_button', 115));

        expect(result.current).toBe('User info: Frank');
    });

    it('cuts a long caption with dots, inside the width less the 4 px gutter', () => {
        const { result } = renderHook(() => useFittedNativeText('Gebruikersinfo: test123456789010', 'il_button', 115));

        expect(result.current.endsWith('...')).toBe(true);
        expect(result.current.length * 6).toBeLessThanOrEqual(111);
        expect(result.current.startsWith('Gebruikersinfo:')).toBe(true);
    });
});
