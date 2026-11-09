import {
    DoorbellMessageEvent,
    FlatAccessDeniedMessageEvent,
    GenericErrorEvent,
    GetGuestRoomResultEvent,
    RoomDataParser,
    RoomDoorbellAcceptedEvent
} from '@octane/renderer';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DoorStateType } from '../../../api';
import { clearMockEventDispatcher, mockEventDispatcher } from '../../../octane-renderer.mock';
import { SharedHookRegistry } from '../../../state/useSharedHook';
import { useDoorState } from './useDoorState';

const wrapper = ({ children }: { children: React.ReactNode }) => <SharedHookRegistry>{children}</SharedHookRegistry>;

const renderDoorStateHook = async () => {
    const hook = renderHook(() => useDoorState(), { wrapper });

    await waitFor(() => expect(hook.result.current).toBeDefined());

    return hook;
};

const makeParserlessEvent = (klass: any, parser: any) => {
    const ev = new klass();
    (ev as any).getParser = () => parser;
    return ev;
};

describe('useDoorState', () => {
    beforeEach(async () => {
        clearMockEventDispatcher();
        const { result, unmount } = await renderDoorStateHook();
        act(() => result.current.reset());
        unmount();
    });

    afterEach(() => {
        cleanup();
    });

    it('exposes the initial NONE snapshot', async () => {
        const { result } = await renderDoorStateHook();
        expect(result.current.snapshot.state).toBe(DoorStateType.NONE);
        expect(result.current.snapshot.roomInfo).toBeNull();
    });

    it('DoorbellMessageEvent with empty userName -> STATE_WAITING', async () => {
        const { result } = await renderDoorStateHook();
        act(() => {
            mockEventDispatcher.dispatchEvent(makeParserlessEvent(DoorbellMessageEvent, { userName: '' }));
        });
        expect(result.current.snapshot.state).toBe(DoorStateType.STATE_WAITING);
    });

    it('DoorbellMessageEvent with non-empty userName does NOT change state', async () => {
        const { result } = await renderDoorStateHook();
        const before = result.current.snapshot.state;
        act(() => {
            mockEventDispatcher.dispatchEvent(makeParserlessEvent(DoorbellMessageEvent, { userName: 'someone' }));
        });
        expect(result.current.snapshot.state).toBe(before);
    });

    it('RoomDoorbellAcceptedEvent (empty userName) -> STATE_ACCEPTED', async () => {
        const { result } = await renderDoorStateHook();
        act(() => {
            mockEventDispatcher.dispatchEvent(makeParserlessEvent(RoomDoorbellAcceptedEvent, { userName: '' }));
        });
        expect(result.current.snapshot.state).toBe(DoorStateType.STATE_ACCEPTED);
    });

    it('FlatAccessDeniedMessageEvent (empty userName) -> STATE_NO_ANSWER', async () => {
        const { result } = await renderDoorStateHook();
        act(() => {
            mockEventDispatcher.dispatchEvent(makeParserlessEvent(FlatAccessDeniedMessageEvent, { userName: '' }));
        });
        expect(result.current.snapshot.state).toBe(DoorStateType.STATE_NO_ANSWER);
    });

    it('GenericErrorEvent -100002 -> STATE_WRONG_PASSWORD', async () => {
        const { result } = await renderDoorStateHook();
        act(() => {
            mockEventDispatcher.dispatchEvent(makeParserlessEvent(GenericErrorEvent, { errorCode: -100002 }));
        });
        expect(result.current.snapshot.state).toBe(DoorStateType.STATE_WRONG_PASSWORD);
    });

    it('GenericErrorEvent 4010 does NOT touch door state', async () => {
        const { result } = await renderDoorStateHook();
        const before = result.current.snapshot.state;
        act(() => {
            mockEventDispatcher.dispatchEvent(makeParserlessEvent(GenericErrorEvent, { errorCode: 4010 }));
        });
        expect(result.current.snapshot.state).toBe(before);
    });

    it('GetGuestRoomResultEvent with roomForward + DOORBELL_STATE -> START_DOORBELL', async () => {
        const { result } = await renderDoorStateHook();
        const fakeRoomData: any = { roomId: 42, roomName: 'r', ownerName: 'other', doorMode: RoomDataParser.DOORBELL_STATE };
        act(() => {
            mockEventDispatcher.dispatchEvent(
                makeParserlessEvent(GetGuestRoomResultEvent, {
                    roomForward: true,
                    isGroupMember: false,
                    data: fakeRoomData
                })
            );
        });
        expect(result.current.snapshot.state).toBe(DoorStateType.START_DOORBELL);
        expect(result.current.snapshot.roomInfo).toBe(fakeRoomData);
    });

    it('GetGuestRoomResultEvent with roomForward + PASSWORD_STATE -> START_PASSWORD', async () => {
        const { result } = await renderDoorStateHook();
        const fakeRoomData: any = { roomId: 42, roomName: 'r', ownerName: 'other', doorMode: RoomDataParser.PASSWORD_STATE };
        act(() => {
            mockEventDispatcher.dispatchEvent(
                makeParserlessEvent(GetGuestRoomResultEvent, {
                    roomForward: true,
                    isGroupMember: false,
                    data: fakeRoomData
                })
            );
        });
        expect(result.current.snapshot.state).toBe(DoorStateType.START_PASSWORD);
    });

    it('GetGuestRoomResultEvent with non-bell/password doorMode does NOT change state', async () => {
        const { result } = await renderDoorStateHook();
        const before = result.current.snapshot.state;
        act(() => {
            mockEventDispatcher.dispatchEvent(
                makeParserlessEvent(GetGuestRoomResultEvent, {
                    roomForward: true,
                    isGroupMember: false,
                    data: { ownerName: 'other', doorMode: 99 }
                })
            );
        });
        expect(result.current.snapshot.state).toBe(before);
    });

    it('GetGuestRoomResultEvent with roomEnter=true resets snapshot to NONE', async () => {
        const { result } = await renderDoorStateHook();
        // First put the hook into a non-NONE state via doorbell
        act(() => {
            mockEventDispatcher.dispatchEvent(makeParserlessEvent(DoorbellMessageEvent, { userName: '' }));
        });
        expect(result.current.snapshot.state).toBe(DoorStateType.STATE_WAITING);
        // Then roomEnter event should dismiss it
        act(() => {
            mockEventDispatcher.dispatchEvent(
                makeParserlessEvent(GetGuestRoomResultEvent, {
                    roomEnter: true,
                    roomForward: false,
                    data: {}
                })
            );
        });
        expect(result.current.snapshot.state).toBe(DoorStateType.NONE);
        expect(result.current.snapshot.roomInfo).toBeNull();
    });

    it('reset() returns snapshot to NONE', async () => {
        const { result } = await renderDoorStateHook();
        act(() => {
            mockEventDispatcher.dispatchEvent(makeParserlessEvent(DoorbellMessageEvent, { userName: '' }));
        });
        expect(result.current.snapshot.state).toBe(DoorStateType.STATE_WAITING);
        act(() => result.current.reset());
        expect(result.current.snapshot.state).toBe(DoorStateType.NONE);
        expect(result.current.snapshot.roomInfo).toBeNull();
    });
});
