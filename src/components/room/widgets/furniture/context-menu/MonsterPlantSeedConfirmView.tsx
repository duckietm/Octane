import { IFurnitureData, RoomObjectCategory } from '@octane/renderer';
import { FC, useEffect, useState } from 'react';
import { FurniCategory, GetFurnitureDataForRoomObject, LocalizeText } from '../../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../../common';
import { BaseButton } from '../../../../../common/BaseButton';
import { NativeTextTree } from '../../../../../common/native-text/NativeTextTree';
import { useRoom } from '../../../../../hooks';

interface MonsterPlantSeedConfirmViewProps {
    objectId: number;
    onClose: () => void;
}

const MODE_DEFAULT: number = -1;
const MODE_MONSTERPLANT_SEED: number = 0;

export const MonsterPlantSeedConfirmView: FC<MonsterPlantSeedConfirmViewProps> = (props) => {
    const { objectId = -1, onClose = null } = props;
    const [furniData, setFurniData] = useState<IFurnitureData>(null);
    const [mode, setMode] = useState(MODE_DEFAULT);
    const { roomSession = null } = useRoom();

    const useProduct = () => {
        roomSession.useMultistateItem(objectId);

        onClose();
    };

    useEffect(() => {
        if (!roomSession || objectId === -1) return;

        const furniData = GetFurnitureDataForRoomObject(roomSession.roomId, objectId, RoomObjectCategory.FLOOR);

        if (!furniData) return;

        setFurniData(furniData);

        let mode = MODE_DEFAULT;

        switch (furniData.specialType) {
            case FurniCategory.MONSTERPLANT_SEED:
                mode = MODE_MONSTERPLANT_SEED;
                break;
        }

        if (mode === MODE_DEFAULT) {
            onClose();

            return;
        }

        setMode(mode);
    }, [roomSession, objectId, onClose]);

    if (mode === MODE_DEFAULT) return null;

    // AIR use_product_widget_frame_plant_seed (388 wide) around use_product_plant_seed (386 x 180): the preview at 10,10, the
    // two wrapped texts 200 wide at x 140, the underlined cancel link and the thick save button on one line.
    return (
        <NativeTextTree>
            <OctaneCardView className="octane-plant-seed-confirm" isResizable={false}>
                <OctaneCardHeaderView headerText={LocalizeText('useproduct.widget.title.plant_seed', ['name'], [furniData.name])} onCloseClick={onClose} />
                <OctaneCardContentView className="octane-plant-seed-confirm__content" overflow="hidden">
                    <div className="octane-plant-seed-confirm__preview">
                        <div className="octane-plant-seed-confirm__plant" />
                    </div>
                    <div className="octane-plant-seed-confirm__description">{LocalizeText('useproduct.widget.text.plant_seed', ['productName'], [furniData.name])}</div>
                    <div className="octane-plant-seed-confirm__info">{LocalizeText('useproduct.widget.info.plant_seed')}</div>
                    <BaseButton className="octane-plant-seed-confirm__cancel" onClick={onClose}>
                        {LocalizeText('useproduct.widget.cancel')}
                    </BaseButton>
                    <Button className="octane-plant-seed-confirm__save" variant="success" onClick={useProduct}>
                        {LocalizeText('useproduct.widget.plant_seed')}
                    </Button>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
