/* @vitest-environment jsdom */

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESKTOP_LAYOUT } from '../../../api/handheld/handheldLayout';
import { useHandheldStore } from '../../../state/handheldStore';

const mocks = vi.hoisted(() => ({
    handlers: new Map<unknown, (event: unknown) => void>(),
    config: {} as Record<string, unknown>,
    currency: 100,
    sendMessageComposer: vi.fn(),
    simpleAlert: vi.fn(),
    createLinkEvent: vi.fn(),
    saveBase64AsScreenshot: vi.fn()
}));

vi.mock('@octane/renderer', async () => {
    const actual = await vi.importActual<Record<string, unknown>>('@octane/renderer');
    const named = (name: string) => ({ [name]: class {} })[name];

    return {
        ...actual,
        CameraPublishStatusMessageEvent: named('CameraPublishStatusMessageEvent'),
        CameraPurchaseOKMessageEvent: named('CameraPurchaseOKMessageEvent'),
        CameraStorageUrlMessageEvent: named('CameraStorageUrlMessageEvent'),
        CompetitionStatusMessageEvent: named('CompetitionStatusMessageEvent'),
        OctaneToolbarAnimateIconEvent: class {},
        PhotoCompetitionMessageComposer: named('PhotoCompetitionMessageComposer'),
        PublishPhotoMessageComposer: named('PublishPhotoMessageComposer'),
        PurchasePhotoMessageComposer: named('PurchasePhotoMessageComposer'),
        ToolbarIconEnum: { INVENTORY: 'inventory' },
        CreateLinkEvent: mocks.createLinkEvent,
        GetEventDispatcher: () => ({ dispatchEvent: vi.fn() }),
        GetSessionDataManager: () => ({ userName: 'Tester' }),
        GetRoomEngine: () => ({ saveBase64AsScreenshot: mocks.saveBase64AsScreenshot })
    };
});

vi.mock('../../../api', () => ({
    FinishCameraRenderMessage: vi.fn(),
    GetCameraEffectDataJson: vi.fn(),
    GetCameraRenderMode: () => 'upload',
    GetConfigurationValue: (key: string, fallback: unknown) => (key in mocks.config ? mocks.config[key] : fallback),
    GetOptionalConfigurationValue: (_key: string, fallback: unknown) => fallback,
    getPublishedPhotoUrl: (id: string) => `https://photos.example/${id}`,
    LocalizeText: (key: string) => key,
    OpenUrl: vi.fn(),
    SendMessageComposer: mocks.sendMessageComposer
}));
vi.mock('../../../api/utils/LocalizeText', () => ({ LocalizeText: (key: string) => key }));

vi.mock('../../../hooks', () => ({
    useMessageEvent: (type: unknown, handler: (event: unknown) => void) => mocks.handlers.set(type, handler),
    useNotification: () => ({ showConfirm: null, simpleAlert: mocks.simpleAlert }),
    usePurse: () => ({ getCurrencyAmount: () => mocks.currency })
}));

vi.mock('../../../common', () => ({
    OctaneCardView: ({ children, className }: { children: React.ReactNode; className?: string }) => (
        <div className={className} data-testid="desktop-window">
            {children}
        </div>
    )
}));

vi.mock('../../../common/draggable-window', () => ({
    DraggableWindow: ({ children, handheldSheet }: { children: React.ReactNode; handheldSheet?: boolean }) => (
        <div data-sheet={String(!!handheldSheet)} data-testid="window">
            {children}
        </div>
    )
}));

vi.mock('./CameraNativeText', () => ({
    CAMERA_BOX_COLOR: 0,
    CAMERA_COMPETITION_COLOR: 0,
    CameraCenteredText: ({ text }: { text: string }) => <span>{text}</span>,
    CameraNativeText: ({ text }: { text: string }) => <span>{text}</span>
}));

vi.mock('./CameraSkinButton', () => ({
    CameraSkinButton: ({ label, onClick }: { label: string; onClick: () => void }) => (
        <button type="button" onClick={onClick}>
            {label}
        </button>
    )
}));

const renderer = await import('@octane/renderer');
const { CameraWidgetCheckoutView } = await import('./CameraWidgetCheckoutView');

const phone = (orientation: 'portrait' | 'landscape' = 'portrait') => act(() => useHandheldStore.setState({ layout: { active: true, orientation } }));
const fire = (type: unknown, parser: unknown) => act(() => mocks.handlers.get(type)?.({ getParser: () => parser }));
const renderCheckout = (price = { credits: 2, duckets: 1, publishDucketPrice: 10 }) => {
    const handlers = { onCancelClick: vi.fn(), onCloseClick: vi.fn() };

    return { ...handlers, ...render(<CameraWidgetCheckoutView base64Url="data:image/png;base64,AAAA" price={price} {...handlers} />) };
};
/** The server answers with where the picture is stored, and the picture loads. */
const loadPicture = (container: HTMLElement) => {
    fire(renderer.CameraStorageUrlMessageEvent, { url: 'photos/1.png' });
    fireEvent.load(container.querySelector('.octane-handheld-camera-checkout__picture img'));
};
const button = (name: string) => screen.getByRole('button', { name });

beforeEach(() => {
    mocks.config = {};
    mocks.currency = 100;
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.handlers.clear();
    act(() => useHandheldStore.setState({ layout: DESKTOP_LAYOUT }));
});

describe('the camera checkout on a phone', () => {
    it('is a sheet with the picture, the prices and the buttons, which wait for the picture', () => {
        phone();
        const { container } = renderCheckout();

        expect(screen.getByTestId('window').dataset.sheet).toBe('true');
        expect(screen.queryByTestId('desktop-window')).toBeNull();
        expect(mocks.saveBase64AsScreenshot).toHaveBeenCalledWith('data:image/png;base64,AAAA');
        expect(screen.getByText('camera.loading')).toBeTruthy();
        expect(screen.getByText('camera.purchase.pleasewait')).toBeTruthy();
        expect([...container.querySelectorAll('.octane-handheld-camera-checkout__amount-value')].map((node) => node.textContent)).toEqual(['2', '1', '10']);
        expect(button('catalog.purchase_confirmation.buy').hasAttribute('disabled')).toBe(true);
        expect(button('camera.publish.button.text').hasAttribute('disabled')).toBe(true);
        // The competition is off by default, as on the desktop.
        expect(screen.queryByText('camera.competition.header')).toBeNull();

        loadPicture(container);

        expect(container.querySelector('.octane-handheld-camera-checkout__picture img')?.getAttribute('src')).toBe('photos/1.png');
        expect(screen.getByText('camera.confirm_phase.info')).toBeTruthy();
        expect(button('catalog.purchase_confirmation.buy').hasAttribute('disabled')).toBe(false);
    });

    it('buys, then offers another and the way to the inventory', () => {
        phone();
        const { container } = renderCheckout();

        loadPicture(container);
        fireEvent.click(button('catalog.purchase_confirmation.buy'));
        expect(mocks.sendMessageComposer).toHaveBeenCalledWith(expect.any(renderer.PurchasePhotoMessageComposer));
        // Waiting: a second tap sends nothing.
        fireEvent.click(button('catalog.purchase_confirmation.buy'));
        expect(mocks.sendMessageComposer).toHaveBeenCalledTimes(1);
        // The bar's Cancel turns into Close while waiting, as on the desktop.
        expect(screen.getByText('generic.close', { selector: '.octane-handheld-camera-checkout__button' })).toBeTruthy();

        fire(renderer.CameraPurchaseOKMessageEvent, {});
        expect(screen.getByText('camera.purchase.successful')).toBeTruthy();
        expect(screen.getByText('camera.purchase.count.info 1')).toBeTruthy();

        fireEvent.click(button('camera.open.inventory'));
        expect(mocks.createLinkEvent).toHaveBeenCalledWith('inventory/show/furni');
        expect(button('camera.buy.another.button.text').hasAttribute('disabled')).toBe(false);
    });

    it('does not buy without the credits', () => {
        mocks.currency = 0;
        phone();
        const { container } = renderCheckout();

        loadPicture(container);
        fireEvent.click(button('catalog.purchase_confirmation.buy'));
        expect(mocks.sendMessageComposer).not.toHaveBeenCalled();
        expect(mocks.simpleAlert).toHaveBeenCalledWith('catalog.alert.notenough.credits.description', null, null, null, 'catalog.alert.notenough.title');
    });

    it('publishes and links to the published picture', () => {
        phone('landscape');
        const { container } = renderCheckout();

        loadPicture(container);
        fireEvent.click(button('camera.publish.button.text'));
        expect(mocks.sendMessageComposer).toHaveBeenCalledWith(expect.any(renderer.PublishPhotoMessageComposer));

        fire(renderer.CameraPublishStatusMessageEvent, { ok: true, secondsToWait: 0, extraDataId: '77' });
        expect(screen.getAllByText('camera.publish.successful').length).toBeGreaterThan(0);
        expect(screen.getByRole('link', { name: 'camera.link.to.published' }).getAttribute('href')).toBe('https://photos.example/77');
        expect(screen.queryByRole('button', { name: 'camera.publish.button.text' })).toBeNull();
    });

    it('sends a competition entry and asks for the spending disclaimer when they are on', () => {
        mocks.config = { 'camera.competition.enabled': true, 'disclaimer.credit_spending.enabled': true };
        phone();
        const { container } = renderCheckout();

        loadPicture(container);
        expect(button('catalog.purchase_confirmation.buy').hasAttribute('disabled')).toBe(true);
        fireEvent.click(screen.getByRole('checkbox'));
        expect(button('catalog.purchase_confirmation.buy').hasAttribute('disabled')).toBe(false);

        fireEvent.click(button('generic.submit'));
        expect(mocks.sendMessageComposer).toHaveBeenCalledWith(expect.any(renderer.PhotoCompetitionMessageComposer));
        fire(renderer.CompetitionStatusMessageEvent, { ok: true });
        expect(screen.getByText('camera.competition.submitted.info')).toBeTruthy();
        expect(button('generic.submit').hasAttribute('disabled')).toBe(true);
    });

    it('cancels and closes through the checkout handlers', () => {
        phone();
        const { onCancelClick, onCloseClick } = renderCheckout();

        fireEvent.click(button('catalog.purchase_confirmation.cancel'));
        expect(onCancelClick).toHaveBeenCalledTimes(1);

        fireEvent.click(button('generic.close'));
        expect(onCloseClick).toHaveBeenCalledTimes(1);
    });
});

describe('the camera checkout on the desktop', () => {
    it('keeps the AIR window', () => {
        const { container } = renderCheckout();

        expect(screen.getByTestId('desktop-window').className).toBe('octane-camera-checkout');
        expect(screen.queryByTestId('window')).toBeNull();
        expect(container.querySelector('.octane-handheld-camera-checkout')).toBeNull();
        expect(container.querySelector('.octane-camera-checkout__box.is-purchase')).not.toBeNull();
    });
});
