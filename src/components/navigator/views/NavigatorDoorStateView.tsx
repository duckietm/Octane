import { FC, useEffect, useState } from 'react';
import { CreateRoomSession, DoorStateType, GoToDesktop, LocalizeText } from '../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useDoorState } from '../../../hooks';
import { OctaneInput } from '../../../layout';

const VISIBLE_STATES = [
    DoorStateType.START_DOORBELL,
    DoorStateType.STATE_WAITING,
    DoorStateType.STATE_NO_ANSWER,
    DoorStateType.START_PASSWORD,
    DoorStateType.STATE_WRONG_PASSWORD
];
const DOORBELL_STATES = [DoorStateType.START_DOORBELL, DoorStateType.STATE_WAITING, DoorStateType.STATE_NO_ANSWER];

export const NavigatorDoorStateView: FC<{}> = (props) => {
    const [password, setPassword] = useState('');
    const { snapshot, setSnapshot, reset } = useDoorState();

    const onClose = () => {
        if (snapshot.state === DoorStateType.STATE_WAITING) GoToDesktop();
        reset();
    };

    const ring = () => {
        if (!snapshot.roomInfo) return;
        CreateRoomSession(snapshot.roomInfo.roomId);
        setSnapshot((prev) => ({ ...prev, state: DoorStateType.STATE_PENDING_SERVER }));
    };

    const tryEntering = () => {
        if (!snapshot.roomInfo) return;
        CreateRoomSession(snapshot.roomInfo.roomId, password);
        setSnapshot((prev) => ({ ...prev, state: DoorStateType.STATE_PENDING_SERVER }));
    };

    useEffect(() => {
        if (snapshot.state !== DoorStateType.STATE_NO_ANSWER) return;
        GoToDesktop();
    }, [snapshot.state]);

    if (snapshot.state === DoorStateType.NONE) return null;
    if (VISIBLE_STATES.indexOf(snapshot.state) === -1) return null;

    const isDoorbell = DOORBELL_STATES.indexOf(snapshot.state) >= 0;

    return (
        <OctaneCardView
            className="octane-navigator-doorbell min-w-0 w-[min(320px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
        >
            <OctaneCardHeaderView headerText={LocalizeText(isDoorbell ? 'navigator.doorbell.title' : 'navigator.password.title')} onCloseClick={onClose} />
            <OctaneCardContentView className="octane-navigator-air__door-state">
                <div className="flex flex-col gap-1">
                    <Text bold>{snapshot.roomInfo && snapshot.roomInfo.roomName}</Text>
                    {snapshot.state === DoorStateType.START_DOORBELL && <Text>{LocalizeText('navigator.doorbell.info')}</Text>}
                    {snapshot.state === DoorStateType.STATE_WAITING && <Text>{LocalizeText('navigator.doorbell.waiting')}</Text>}
                    {snapshot.state === DoorStateType.STATE_NO_ANSWER && <Text>{LocalizeText('navigator.doorbell.no.answer')}</Text>}
                    {snapshot.state === DoorStateType.START_PASSWORD && <Text>{LocalizeText('navigator.password.info')}</Text>}
                    {snapshot.state === DoorStateType.STATE_WRONG_PASSWORD && <Text>{LocalizeText('navigator.password.retryinfo')}</Text>}
                </div>
                {isDoorbell && (
                    <div className="flex flex-col gap-1">
                        {snapshot.state === DoorStateType.START_DOORBELL && (
                            <Button variant="success" onClick={ring}>
                                {LocalizeText('navigator.doorbell.button.ring')}
                            </Button>
                        )}
                        <Button variant="danger" onClick={onClose}>
                            {LocalizeText('generic.cancel')}
                        </Button>
                    </div>
                )}
                {!isDoorbell && (
                    <>
                        <div className="flex flex-col gap-1">
                            <Text>{LocalizeText('navigator.password.enter')}</Text>
                            <OctaneInput
                                autoFocus
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' && password.length) tryEntering();
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <Button disabled={!password.length} variant="success" onClick={tryEntering}>
                                {LocalizeText('navigator.password.button.try')}
                            </Button>
                            <Button variant="danger" onClick={onClose}>
                                {LocalizeText('generic.cancel')}
                            </Button>
                        </div>
                    </>
                )}
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
