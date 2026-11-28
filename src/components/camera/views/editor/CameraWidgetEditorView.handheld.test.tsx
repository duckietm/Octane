/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../../state/handheldStore';

const mocks = vi.hoisted(() => ({
    applyEffects: vi.fn(async (_texture: unknown, effects: { effect: { name: string } }[], zoom: boolean) => ({
        src: `rendered-${effects.map((entry) => entry.effect.name).join('+')}${zoom ? '-zoom' : ''}.png`
    })),
    createLinkEvent: vi.fn()
}));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('@octane/renderer');

    return {
        ...actual,
        CreateLinkEvent: mocks.createLinkEvent,
        // The effects are WebGL in the client; here they "render" to a name, so the flow can be followed.
        GetRoomCameraWidgetManager: () => ({ isLoaded: true, init: vi.fn(), applyEffects: mocks.applyEffects }),
        RoomCameraWidgetSelectedEffect: class {
            constructor(
                public effect: unknown,
                public strength: number
            ) {}
        }
    };
});

vi.mock('../../../../api', async () => {
    const actual = await vi.importActual<typeof import('../../../../api')>('../../../../api');

    return { ...actual, LocalizeText: (key: string) => key, localizeWithFallback: (_key: string, fallback: string) => fallback };
});
vi.mock('../../../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../../../common', () => ({
    OctaneCardView: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className} data-testid="desktop-window">
            {children}
        </div>
    ),
    Slider: ({ value, onChange, thumbAriaLabel }: { value: number; onChange: (value: number) => void; thumbAriaLabel: string }) => (
        <input aria-label={thumbAriaLabel} type="range" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    )
}));

vi.mock('../../../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: React.ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

vi.mock('../CameraNativeText', () => ({
    CAMERA_BOX_COLOR: 0,
    CameraCenteredText: ({ text }: { text: string }) => <span>{text}</span>,
    CameraNativeText: ({ text }: { text: string }) => <span>{text}</span>
}));

const { CameraWidgetEditorView } = await import('./CameraWidgetEditorView');

const effects = [
    { name: 'dark_sepia', colorMatrix: [1], minLevel: 0, type: 'colormatrix' },
    { name: 'night_vision', colorMatrix: [1], minLevel: 5, type: 'colormatrix' },
    { name: 'frame_gold', texture: {}, minLevel: 0, type: 'frame' }
];
const picture = { imageUrl: 'shot.png', texture: { id: 'texture' }, renderRoomMessage: null };
const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));
const renderEditor = () => {
    const handlers = { onCheckout: vi.fn(), onCancel: vi.fn(), onClose: vi.fn() };

    return { ...handlers, ...render(<CameraWidgetEditorView availableEffects={effects as never} myLevel={2} picture={picture as never} {...handlers} />) };
};
const picture$ = (container: HTMLElement) => container.querySelector('.octane-handheld-camera-editor__picture img')?.getAttribute('src');

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('the camera editor on a phone', () => {
    it('is a sheet with the effect categories as tabs, the picture and the effect tiles', async () => {
        phone();
        const { container } = renderEditor();

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(screen.queryByTestId('desktop-window')).toBeNull();
        expect(screen.getByRole('tab', { name: 'camera.effect.category.colormatrix' }).getAttribute('aria-selected')).toBe('true');
        expect(picture$(container)).toBe('shot.png');

        const tiles = container.querySelectorAll('.octane-handheld-camera-editor__tile');

        expect(tiles).toHaveLength(2);
        // Level 5 is above the user's level 2: locked, showing the level it needs.
        expect(screen.getByRole('button', { name: 'camera.effect.required.level 5' }).hasAttribute('disabled')).toBe(true);

        fireEvent.click(screen.getByRole('tab', { name: 'camera.effect.category.composite' }));
        expect(screen.getByRole('button', { name: 'camera.effect.name.frame_gold' })).toBeTruthy();
        await waitFor(() => expect(container.querySelector('.octane-handheld-camera-editor__tile img')).not.toBeNull());
    });

    it('puts an effect on, sets its strength, takes it off and clears all', async () => {
        phone();
        const { container } = renderEditor();

        fireEvent.click(screen.getByRole('button', { name: 'camera.effect.name.dark_sepia' }));
        expect(screen.getByText('camera.effect.name.dark_sepia 50%')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'camera.effect.name.dark_sepia' }).getAttribute('aria-pressed')).toBe('true');
        await waitFor(() => expect(picture$(container)).toBe('rendered-dark_sepia.png'));

        fireEvent.change(screen.getByRole('slider', { name: 'camera.effect.name.dark_sepia' }), { target: { value: '80' } });
        expect(screen.getByText('camera.effect.name.dark_sepia 80%')).toBeTruthy();

        fireEvent.click(screen.getByText('camera.delete.button.text'));
        expect(screen.getByRole('button', { name: 'camera.effect.name.dark_sepia' }).getAttribute('aria-pressed')).toBe('false');
        await waitFor(() => expect(picture$(container)).toBe('shot.png'));

        const clear = screen.getByText('Clear all');

        expect(clear.hasAttribute('disabled')).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'camera.effect.name.dark_sepia' }));
        fireEvent.click(screen.getByRole('tab', { name: 'camera.effect.category.composite' }));
        fireEvent.click(screen.getByRole('button', { name: 'camera.effect.name.frame_gold' }));
        // A frame has no strength.
        expect(screen.getByText('camera.effect.name.frame_gold')).toBeTruthy();
        expect(screen.queryByRole('slider')).toBeNull();
        await waitFor(() => expect(picture$(container)).toBe('rendered-dark_sepia+frame_gold.png'));

        fireEvent.click(screen.getByText('Clear all'));
        expect(container.querySelector('.octane-handheld-camera-editor__tile[aria-pressed="true"]')).toBeNull();
        expect(screen.getByText('Tap an effect to put it on the picture.')).toBeTruthy();
        await waitFor(() => expect(picture$(container)).toBe('shot.png'));
    });

    it('zooms, saves the picture and hands the checkout what the desktop does', async () => {
        phone('landscape');
        const { container, onCheckout } = renderEditor();
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

        fireEvent.click(screen.getByRole('button', { name: 'camera.effect.name.dark_sepia' }));
        fireEvent.click(screen.getByText('room.zoom.button.text'));
        expect(screen.getByText('room.zoom.button.text').getAttribute('aria-pressed')).toBe('true');
        await waitFor(() => expect(picture$(container)).toBe('rendered-dark_sepia-zoom.png'));

        fireEvent.click(screen.getByText('floor.plan.editor.save'));
        expect(click).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByText('camera.preview.button.text'));
        expect(onCheckout).toHaveBeenCalledWith('rendered-dark_sepia-zoom.png', [expect.objectContaining({ strength: 0.5 })], 2);
        click.mockRestore();
    });

    it('cancels, closes and opens the help page', () => {
        phone();
        const { onCancel, onClose } = renderEditor();

        fireEvent.click(screen.getByText('catalog.purchase_confirmation.cancel'));
        expect(onCancel).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'generic.close' }));
        expect(onClose).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'generic.help' }));
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('habbopages/camera');
    });
});

describe('the camera editor on the desktop', () => {
    it('keeps the AIR window', () => {
        const { container } = renderEditor();

        expect(screen.getByTestId('desktop-window').className).toBe('octane-camera-editor');
        expect(screen.queryByTestId('window')).toBeNull();
        expect(container.querySelector('.octane-handheld-camera-editor')).toBeNull();
        expect(container.querySelector('.octane-camera-effect-grid')).not.toBeNull();
    });
});
