import { EditEventMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../../common';
import { OctaneInput } from '../../../../../layout';

interface RoomPromoteEditWidgetViewProps {
    eventId: number;
    eventName: string;
    eventDescription: string;
    setIsEditingPromote: (value: boolean) => void;
}

export const RoomPromoteEditWidgetView: FC<RoomPromoteEditWidgetViewProps> = (props) => {
    const { eventId = -1, eventName = '', eventDescription = '', setIsEditingPromote = null } = props;
    const [newEventName, setNewEventName] = useState<string>(eventName);
    const [newEventDescription, setNewEventDescription] = useState<string>(eventDescription);

    const updatePromote = () => {
        SendMessageComposer(new EditEventMessageComposer(eventId, newEventName, newEventDescription));
        setIsEditingPromote(false);
    };

    return (
        <OctaneCardView className="octane-guide-tool octane-room-promote-edit min-w-0 w-[min(340px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('navigator.eventsettings.editcaption')} onCloseClick={() => setIsEditingPromote(false)} />
            <OctaneCardContentView className="text-black">
                <div className="flex flex-col">
                    <Text bold>{LocalizeText('navigator.eventsettings.name')}</Text>
                    <OctaneInput
                        maxLength={64}
                        placeholder={LocalizeText('navigator.eventsettings.name')}
                        type="text"
                        value={newEventName}
                        onChange={(event) => setNewEventName(event.target.value)}
                    />
                </div>
                <div className="flex flex-col">
                    <Text bold>{LocalizeText('navigator.eventsettings.desc')}</Text>
                    <textarea
                        className="min-h-[calc(1.5em+ .5rem+2px)] px-[.5rem] py-[.25rem] rounded-[.2rem] form-control-sm"
                        maxLength={64}
                        placeholder={LocalizeText('navigator.eventsettings.desc')}
                        value={newEventDescription}
                        onChange={(event) => setNewEventDescription(event.target.value)}
                    ></textarea>
                </div>
                <div className="flex flex-col">
                    <Button
                        fullWidth
                        disabled={!newEventName || !newEventDescription}
                        variant={!newEventName || !newEventDescription ? 'danger' : 'success'}
                        onClick={(event) => updatePromote()}
                    >
                        {LocalizeText('navigator.eventsettings.edit')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
