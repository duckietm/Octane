import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAvatarEditor } from './useAvatarEditor';

const mocks = vi.hoisted(() => ({ selectPart: vi.fn(), selectColor: vi.fn() }));

vi.mock('@octane/renderer', () => ({
    AvatarFigurePartType: { CHEST: 'ch', CHEST_PRINT: 'cp', LEGS: 'lg', SHOES: 'sh' },
    FigureSetIdsMessageEvent: class {},
    UserWardrobePageEvent: class {}
}));
vi.mock('@/state/useSharedHook', () => ({
    registerSharedHook: vi.fn(),
    useSharedHook: (useSource: () => unknown) => useSource()
}));
vi.mock('../../api', () => ({}));
vi.mock('../events', () => ({ useMessageEvent: vi.fn() }));
vi.mock('./useFigureData', () => ({
    useFigureData: () => ({
        selectedColors: { ch: [92] },
        selectedParts: { ch: 210 },
        gender: 'M',
        selectPart: mocks.selectPart,
        selectColor: mocks.selectColor
    })
}));

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

it('accepts existing figure colors before the active editor model is initialized', () => {
    const { result } = renderHook(() => useAvatarEditor());
    expect(result.current.selectedColorParts).toEqual({});
    act(() => {
        result.current.selectEditorPart('ch', 210);
        result.current.selectEditorColor('ch', 0, 92);
    });
    expect(mocks.selectPart).not.toHaveBeenCalled();
    expect(mocks.selectColor).not.toHaveBeenCalled();
});
