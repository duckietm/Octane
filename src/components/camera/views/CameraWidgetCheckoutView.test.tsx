import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    renderMode: 'upload' as 'upload' | 'server',
    saveBase64AsScreenshot: vi.fn(),
    sendMessageComposer: vi.fn(),
    simpleAlert: vi.fn(),
    finishCameraRenderMessage: vi.fn((composer: unknown, effects: string, zoom: number) => !!composer),
    getCameraEffectDataJson: vi.fn(() => '[{"name":"dark_sepia","alpha":127},{"name":"frame_gold"}]')
}));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('@octane/renderer');
    const event = class {};

    return {
        ...actual,
        CameraPublishStatusMessageEvent: event,
        CameraPurchaseOKMessageEvent: event,
        CameraStorageUrlMessageEvent: event,
        CompetitionStatusMessageEvent: event,
        OctaneToolbarAnimateIconEvent: event,
        PhotoCompetitionMessageComposer: event,
        PublishPhotoMessageComposer: event,
        PurchasePhotoMessageComposer: event,
        ToolbarIconEnum: { INVENTORY: 'inventory' },
        GetRoomEngine: () => ({ saveBase64AsScreenshot: mocks.saveBase64AsScreenshot })
    };
});

vi.mock('../../../api', () => ({
    FinishCameraRenderMessage: mocks.finishCameraRenderMessage,
    GetCameraEffectDataJson: mocks.getCameraEffectDataJson,
    GetCameraRenderMode: () => mocks.renderMode,
    GetConfigurationValue: (_key: string, fallback: unknown) => fallback,
    LocalizeText: (key: string) => key,
    OpenUrl: vi.fn(),
    SendMessageComposer: mocks.sendMessageComposer
}));

vi.mock('../../../hooks', () => ({
    useMessageEvent: vi.fn(),
    useNotification: () => ({ showConfirm: vi.fn(), simpleAlert: mocks.simpleAlert }),
    usePurse: () => ({ getCurrencyAmount: () => 0 })
}));

vi.mock('../../../common', () => ({
    OctaneCardView: ({ children }: { children: unknown }) => <div>{children as never}</div>
}));

vi.mock('./CameraNativeText', () => ({
    CAMERA_BOX_COLOR: 0,
    CAMERA_COMPETITION_COLOR: 0,
    CameraCenteredText: ({ text }: { text: string }) => <span>{text}</span>,
    CameraNativeText: ({ text }: { text: string }) => <span>{text}</span>
}));

vi.mock('./CameraSkinButton', () => ({
    CameraSkinButton: ({ label }: { label: string }) => <button type="button">{label}</button>
}));

const { CameraWidgetCheckoutView } = await import('./CameraWidgetCheckoutView');

const price = { credits: 2, duckets: 0, publishDucketPrice: 10 };
const scene = { id: 'scene' };
const effects = [ { effect: { name: 'dark_sepia', type: 'colormatrix' }, strength: 0.5 } ] as never[];

const renderCheckout = (picture: unknown) => render(
    <CameraWidgetCheckoutView
        base64Url="data:image/png;base64,AAAA"
        effects={effects}
        picture={picture as never}
        price={price}
        zoom={2}
        onCancelClick={vi.fn()}
        onCloseClick={vi.fn()}
    />
);

afterEach(() => {
    cleanup();
    mocks.renderMode = 'upload';
    mocks.saveBase64AsScreenshot.mockClear();
    mocks.sendMessageComposer.mockClear();
    mocks.simpleAlert.mockClear();
    mocks.finishCameraRenderMessage.mockClear();
});

describe('CameraWidgetCheckoutView camera.render.mode', () => {
    it('uploads the browser-rendered PNG by default', () => {
        renderCheckout({ renderRoomMessage: scene });

        expect(mocks.saveBase64AsScreenshot).toHaveBeenCalledWith('data:image/png;base64,AAAA');
        expect(mocks.sendMessageComposer).not.toHaveBeenCalled();
    });

    it('sends the AIR scene captured at the shutter with the effects and zoom in server mode', () => {
        mocks.renderMode = 'server';
        renderCheckout({ renderRoomMessage: scene });

        expect(mocks.finishCameraRenderMessage).toHaveBeenCalledWith(scene, '[{"name":"dark_sepia","alpha":127},{"name":"frame_gold"}]', 2);
        expect(mocks.sendMessageComposer).toHaveBeenCalledWith(scene);
        expect(mocks.saveBase64AsScreenshot).not.toHaveBeenCalled();
    });

    it('fails like AIR when the photo has no scene', () => {
        mocks.renderMode = 'server';
        renderCheckout({ renderRoomMessage: null });

        expect(mocks.sendMessageComposer).not.toHaveBeenCalled();
        expect(mocks.saveBase64AsScreenshot).not.toHaveBeenCalled();
        expect(mocks.simpleAlert).toHaveBeenCalledWith('camera.alert.too_much_stuff', null, null, null, 'generic.alert.title');
    });
});
