import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductTypeEnum } from '../../../../../api';
import { CatalogPreviewControls } from './CatalogPreviewControls';

afterEach(cleanup);

describe('standard catalog product preview controls', () => {
    it('keeps furniture controls limited to independent left/right rotation', () => {
        const rotations: boolean[] = [];
        const roomPreviewer = {
            changeRoomObjectDirection: (clockwise: boolean) => rotations.push(clockwise),
            zoomIn: vi.fn(),
            zoomOut: vi.fn()
        } as any;

        render(<CatalogPreviewControls productType={ProductTypeEnum.FLOOR} roomPreviewer={roomPreviewer} />);

        fireEvent.click(screen.getByRole('button', { name: 'Rotate left' }));
        fireEvent.click(screen.getByRole('button', { name: 'Rotate right' }));

        expect(rotations).toEqual([true, false]);
        expect(screen.queryByRole('button', { name: 'Change state' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Toggle zoom' })).not.toBeInTheDocument();
        expect(roomPreviewer.zoomIn).not.toHaveBeenCalled();
        expect(roomPreviewer.zoomOut).not.toHaveBeenCalled();
    });

    it('does not expose zoom for loaded furniture even when the renderer can zoom the canvas', () => {
        const capabilities = {
            mode: 'wall',
            canRotate: true,
            canChangeState: false,
            canUseAvatarActions: false,
            canZoomIn: false,
            canZoomOut: true
        };
        const roomPreviewer = {
            changeRoomObjectDirection: vi.fn(),
            changeRoomObjectState: vi.fn(),
            getPreviewCapabilities: () => capabilities,
            subscribePreviewCapabilities: () => () => undefined,
            zoomIn: vi.fn(),
            zoomOut: vi.fn()
        } as any;

        render(<CatalogPreviewControls productType={ProductTypeEnum.WALL} roomPreviewer={roomPreviewer} />);

        expect(screen.getByRole('button', { name: 'Rotate left' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'Rotate right' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: 'Toggle zoom' })).not.toBeInTheDocument();
    });

    it('keeps rotation controls visible but disabled for furniture that cannot rotate', () => {
        const capabilities = {
            mode: 'floor',
            canRotate: false,
            canChangeState: true,
            canUseAvatarActions: false,
            canZoomIn: false,
            canZoomOut: true
        };
        const roomPreviewer = {
            changeRoomObjectDirection: vi.fn(),
            getPreviewCapabilities: () => capabilities,
            subscribePreviewCapabilities: () => () => undefined,
            zoomIn: vi.fn(),
            zoomOut: vi.fn()
        } as any;

        render(<CatalogPreviewControls productType={ProductTypeEnum.FLOOR} roomPreviewer={roomPreviewer} />);

        expect(screen.getByRole('button', { name: 'Rotate left' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Rotate right' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Toggle zoom' })).not.toBeInTheDocument();
    });

    it('hides the toolbar for wall items that cannot rotate', () => {
        const capabilities = {
            mode: 'wall',
            canRotate: false,
            canChangeState: true,
            canUseAvatarActions: false,
            canZoomIn: false,
            canZoomOut: true
        };
        const roomPreviewer = {
            changeRoomObjectDirection: vi.fn(),
            getPreviewCapabilities: () => capabilities,
            subscribePreviewCapabilities: () => () => undefined,
            zoomIn: vi.fn(),
            zoomOut: vi.fn()
        } as any;

        render(<CatalogPreviewControls productType={ProductTypeEnum.WALL} roomPreviewer={roomPreviewer} />);

        expect(screen.queryByRole('toolbar', { name: 'Product preview' })).not.toBeInTheDocument();
    });

    it('uses dedicated rotation, zoom and action controls for purchasable clothing', () => {
        const capabilities = {
            mode: 'avatar',
            canRotate: true,
            canChangeState: false,
            canUseAvatarActions: true,
            canZoomIn: true,
            canZoomOut: false
        };
        const roomPreviewer = {
            changeRoomObjectDirection: vi.fn(),
            cycleAvatarAction: vi.fn(),
            getPreviewCapabilities: () => capabilities,
            subscribePreviewCapabilities: () => () => undefined,
            zoomIn: vi.fn(),
            zoomOut: vi.fn()
        } as any;

        render(<CatalogPreviewControls productType={ProductTypeEnum.FLOOR} roomPreviewer={roomPreviewer} />);

        expect(screen.getByRole('toolbar', { name: 'Product preview' })).toHaveClass('is-avatar');
        expect(screen.queryByRole('button', { name: 'Change state' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Rotate left' }));

        expect(roomPreviewer.changeRoomObjectDirection).toHaveBeenCalledWith(true);
        fireEvent.click(screen.getByRole('button', { name: 'Change avatar action' }));

        const zoomButton = screen.getByRole('button', { name: 'Toggle zoom' });

        expect(zoomButton).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(zoomButton);

        expect(roomPreviewer.cycleAvatarAction).toHaveBeenCalledOnce();
        expect(zoomButton).toHaveAttribute('aria-pressed', 'false');
        expect(roomPreviewer.zoomIn).not.toHaveBeenCalled();
        expect(roomPreviewer.zoomOut).not.toHaveBeenCalled();
        expect(zoomButton.querySelector('.icon-zoom-more')).toBeInTheDocument();
    });

    it('keeps standard preview actions from leaking into the room-canvas click handler', () => {
        const canvasClick = vi.fn();
        const roomPreviewer = {
            changeRoomObjectDirection: vi.fn(),
            changeRoomObjectState: vi.fn(),
            zoomIn: vi.fn(),
            zoomOut: vi.fn()
        } as any;

        const view = render(
            <div onClick={canvasClick}>
                <CatalogPreviewControls productType={ProductTypeEnum.FLOOR} roomPreviewer={roomPreviewer} />
            </div>
        );

        fireEvent.click(within(view.container).getByRole('button', { name: 'Rotate left' }));

        expect(roomPreviewer.changeRoomObjectDirection).toHaveBeenCalledWith(true);
        expect(canvasClick).not.toHaveBeenCalled();
    });
});
