import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Capture handlers registered by useMessageEvent / useOctaneEvent so we can fire fake events.
const messageHandlers = new Map<unknown, (event: unknown) => void>();
const octaneHandlers = new Map<unknown, (event: unknown) => void>();

vi.mock('../../hooks', async () => {
    return {
        useMessageEvent: (eventClass: unknown, handler: (event: unknown) => void) => {
            messageHandlers.set(eventClass, handler);
        },
        useOctaneEvent: (eventType: unknown, handler: (event: unknown) => void) => {
            octaneHandlers.set(eventType, handler);
        }
    };
});

// Spy SendMessageComposer — use importOriginal to keep all other api exports intact
// (DraggableWindow et al. rely on GetLocalStorage and others at mount time).
const sendMessageComposer = vi.fn();
vi.mock('../../api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../api')>();
    return {
        ...actual,
        SendMessageComposer: (...args: unknown[]) => sendMessageComposer(...args),
        LocalizeText: (key: string) => key
    };
});

import {
    AddLinkEventTracker,
    FloorHeightMapEvent,
    GetOccupiedTilesMessageComposer,
    GetRoomEntryTileMessageComposer,
    RemoveLinkEventTracker,
    RoomEngineEvent,
    RoomEntryTileMessageEvent,
    RoomOccupiedTilesMessageEvent,
    RoomVisualizationSettingsEvent,
    UpdateFloorPropertiesMessageComposer
} from '@octane/renderer';
import { FloorplanEditorView } from './FloorplanEditorView';

// The Button component in this codebase renders as a <div> (via Base), not <button>.
// OctaneCardView portals everything into #draggable-windows-container.
// Find a clickable element by its exact trimmed text content in the portal.
const findByExactText = (text: string): Element | undefined => {
    const container = document.getElementById('draggable-windows-container') ?? document.body;
    return Array.from(container.querySelectorAll('div')).find((el: Element) => el.textContent?.trim() === text);
};

describe('FloorplanEditorView container', () => {
    beforeEach(() => {
        messageHandlers.clear();
        octaneHandlers.clear();
        sendMessageComposer.mockClear();
        (AddLinkEventTracker as ReturnType<typeof vi.fn>).mockClear();
        (RemoveLinkEventTracker as ReturnType<typeof vi.fn>).mockClear();
    });

    afterEach(() => cleanup());

    const openEditor = () => {
        render(<FloorplanEditorView />);
        // Trigger link tracker: 'floor-editor/show' to make editor visible
        const tracker = (AddLinkEventTracker as ReturnType<typeof vi.fn>).mock.calls[0][0];
        act(() => tracker.linkReceived('floor-editor/show'));
    };

    it('registers a link tracker on mount with floor-editor/ prefix', () => {
        render(<FloorplanEditorView />);
        expect(AddLinkEventTracker).toHaveBeenCalledTimes(1);
        const tracker = (AddLinkEventTracker as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(tracker.eventUrlPrefix).toBe('floor-editor/');
    });

    it('dispatches GetRoomEntryTileMessageComposer when editor becomes visible', () => {
        openEditor();
        const composers = sendMessageComposer.mock.calls.map((c: unknown[]) => c[0]);
        const entryComposer = composers.find((c: unknown) => c instanceof GetRoomEntryTileMessageComposer);
        expect(entryComposer).toBeTruthy();
    });

    it('dispatches GetOccupiedTilesMessageComposer when editor becomes visible', () => {
        openEditor();
        const composers = sendMessageComposer.mock.calls.map((c: unknown[]) => c[0]);
        const occupiedComposer = composers.find((c: unknown) => c instanceof GetOccupiedTilesMessageComposer);
        expect(occupiedComposer).toBeTruthy();
    });

    it('seeds door from RoomEntryTileMessageEvent', () => {
        openEditor();
        const handler = messageHandlers.get(RoomEntryTileMessageEvent);
        expect(handler).toBeTruthy();
        act(() => handler!({ getParser: () => ({ x: 3, y: 4, direction: 6 }) }));
        // Seed tilemap + thickness so Save is callable
        const fhmHandler = messageHandlers.get(FloorHeightMapEvent);
        act(() => fhmHandler!({ getParser: () => ({ model: '00\rxq', wallHeight: 5 }) }));
        const rvsHandler = messageHandlers.get(RoomVisualizationSettingsEvent);
        act(() => rvsHandler!({ getParser: () => ({ thicknessWall: 1, thicknessFloor: 1 }) }));
        // With LocalizeText mocked to identity, the button text is literally the i18n key.
        // Button renders as <div> (not <button>) — use findByExactText.
        const saveBtn = findByExactText('floor.plan.editor.save');
        expect(saveBtn).toBeTruthy();
        sendMessageComposer.mockClear();
        fireEvent.click(saveBtn!);
        expect(sendMessageComposer).toHaveBeenCalledTimes(1);
        const composer = sendMessageComposer.mock.calls[0][0];
        expect(composer).toBeInstanceOf(UpdateFloorPropertiesMessageComposer);
        expect(composer.doorX).toBe(3);
        expect(composer.doorY).toBe(4);
        expect(composer.dir).toBe(6);
    });

    it('Save composer carries wallHeight - 1 from the reducer state', () => {
        openEditor();
        const fhmHandler = messageHandlers.get(FloorHeightMapEvent);
        // parser.wallHeight = 4 → state.wallHeight = 4 + 1 = 5 → Save sends 5 - 1 = 4
        act(() => fhmHandler!({ getParser: () => ({ model: '0', wallHeight: 4 }) }));
        const saveBtn = findByExactText('floor.plan.editor.save');
        expect(saveBtn).toBeTruthy();
        sendMessageComposer.mockClear();
        fireEvent.click(saveBtn!);
        const composer = sendMessageComposer.mock.calls[0][0];
        expect(composer).toBeInstanceOf(UpdateFloorPropertiesMessageComposer);
        expect(composer.wallHeight).toBe(4);
    });

    it('Save composer thickness goes through convertNumbersForSaving', () => {
        openEditor();
        const fhmHandler = messageHandlers.get(FloorHeightMapEvent);
        act(() => fhmHandler!({ getParser: () => ({ model: '0', wallHeight: 0 }) }));
        const rvsHandler = messageHandlers.get(RoomVisualizationSettingsEvent);
        // server sends 2 for both; convertSettingToNumber(2) = 3; reducer stores thickness=3
        // Save applies convertNumbersForSaving(3) = 1
        act(() => rvsHandler!({ getParser: () => ({ thicknessWall: 2, thicknessFloor: 2 }) }));
        const saveBtn = findByExactText('floor.plan.editor.save');
        expect(saveBtn).toBeTruthy();
        sendMessageComposer.mockClear();
        fireEvent.click(saveBtn!);
        const composer = sendMessageComposer.mock.calls[0][0];
        expect(composer).toBeInstanceOf(UpdateFloorPropertiesMessageComposer);
        expect(composer.thicknessWall).toBe(1);
        expect(composer.thicknessFloor).toBe(1);
    });

    it('RoomOccupiedTilesMessageEvent marks tiles occupied without altering the saved tilemap', () => {
        openEditor();
        const fhmHandler = messageHandlers.get(FloorHeightMapEvent);
        // 2x2 grid: '00\r00' → rows 0 and 1, each with 2 walkable tiles
        act(() => fhmHandler!({ getParser: () => ({ model: '00\r00', wallHeight: 0 }) }));
        const occHandler = messageHandlers.get(RoomOccupiedTilesMessageEvent);
        expect(occHandler).toBeTruthy();
        // Mark col 1 of row 0 as occupied; blockedTilesMap[row][col]
        const blockedTilesMap = [
            [false, true],
            [false, false]
        ];
        act(() => occHandler!({ getParser: () => ({ blockedTilesMap }) }));
        const saveBtn = findByExactText('floor.plan.editor.save');
        expect(saveBtn).toBeTruthy();
        sendMessageComposer.mockClear();
        fireEvent.click(saveBtn!);
        const composer = sendMessageComposer.mock.calls[0][0];
        expect(composer).toBeInstanceOf(UpdateFloorPropertiesMessageComposer);
        // Occupied is purely informational: the tile stays walkable and the
        // saved tilemap is unchanged (row 0 stays '00', NOT voided to '0x').
        expect(composer.tilemap.split(/\r/)[0]).toBe('00');
    });

    it('RoomEngineEvent.DISPOSED hides the editor', () => {
        render(<FloorplanEditorView />);
        const tracker = (AddLinkEventTracker as ReturnType<typeof vi.fn>).mock.calls[0][0];
        act(() => tracker.linkReceived('floor-editor/show'));
        // Editor should be visible — OctaneCardHeaderView renders the title
        expect(document.body.textContent).toContain('floor.plan.editor.title');
        const disposeHandler = octaneHandlers.get(RoomEngineEvent.DISPOSED);
        expect(disposeHandler).toBeTruthy();
        act(() => disposeHandler!({}));
        expect(document.body.textContent).not.toContain('floor.plan.editor.title');
    });

    it('cleans up the link tracker on unmount', () => {
        const { unmount } = render(<FloorplanEditorView />);
        expect(RemoveLinkEventTracker).not.toHaveBeenCalled();
        unmount();
        expect(RemoveLinkEventTracker).toHaveBeenCalledTimes(1);
    });

    it('reuses the editor for an external arena floor plan without room messages', () => {
        const onClose = vi.fn();
        const onSave = vi.fn();

        const { queryByTestId } = render(
            <FloorplanEditorView
                externalSession={{
                    tilemap: '00\r0x',
                    occupiedTiles: [[false, true], [false, false]],
                    title: 'SnowStorm Floor Plan Editor',
                    onClose,
                    onSave
                }}
            />
        );

        expect(document.body.textContent).toContain('SnowStorm Floor Plan Editor');
        expect(queryByTestId('tool-door')).toBeNull();
        expect(AddLinkEventTracker).not.toHaveBeenCalled();
        expect(sendMessageComposer).not.toHaveBeenCalled();

        const saveBtn = findByExactText('floor.plan.editor.save');
        expect(saveBtn).toBeTruthy();
        fireEvent.click(saveBtn!);

        expect(onSave).toHaveBeenCalledWith('00\r0x');
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(sendMessageComposer).not.toHaveBeenCalled();
    });
});
