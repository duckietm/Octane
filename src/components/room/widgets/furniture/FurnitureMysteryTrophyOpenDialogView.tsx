import { OpenMysteryTrophyMessageComposer } from '@octane/renderer';
import { FC, useState } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';

interface FurnitureMysteryTrophyOpenDialogViewProps {
    objectId: number;
    onClose: () => void;
}

export const FurnitureMysteryTrophyOpenDialogView: FC<FurnitureMysteryTrophyOpenDialogViewProps> = (props) => {
    const { objectId = -1, onClose = null } = props;
    const [description, setDescription] = useState<string>('');

    const onConfirm = () => {
        SendMessageComposer(new OpenMysteryTrophyMessageComposer(objectId, description));
        onClose();
    };

    if (objectId === -1) return null;

    return (
        <OctaneCardView
            isResizable={false}
            className="octane-mysterytrophy-dialog min-w-0 w-[min(400px,calc(100vw-16px))] max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
        >
            <OctaneCardHeaderView center headerText={LocalizeText('mysterytrophy.header.title')} onCloseClick={onClose} />
            <OctaneCardContentView>
                <div className="flex mysterytrophy-dialog-top p-3">
                    <div className="mysterytrophy-image shrink-0"></div>
                    <div className="m-2">
                        <Text className="mysterytrophy-text-big" variant="white">
                            {LocalizeText('mysterytrophy.header.description')}
                        </Text>
                    </div>
                </div>
                <div className="flex mysterytrophy-dialog-bottom p-2">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center bg-white rounded py-1 px-2 input-mysterytrophy-dialog">
                            <textarea
                                className="min-h-[calc(1.5em+ .5rem+2px)] px-[.5rem] py-[.25rem] rounded-[.2rem] form-control-sm input-mysterytrophy"
                                value={description}
                                onChange={(event) => setDescription(event.target.value)}
                            />
                            <div className="mysterytrophy-pencil-image shrink-0 small fa-icon"></div>
                        </div>
                        <div className="flex items-center mt-2 gap-5 justify-center">
                            <Text pointer className="text-decoration" onClick={() => onClose()}>
                                {LocalizeText('cancel')}
                            </Text>
                            <Button variant="success" onClick={() => onConfirm()}>
                                {LocalizeText('generic.ok')}
                            </Button>
                        </div>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
