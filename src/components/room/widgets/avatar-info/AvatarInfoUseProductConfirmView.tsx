import {
    GetRoomEngine,
    IFurnitureData,
    IPetCustomPart,
    IRoomUserData,
    PetCustomPart,
    PetFigureData,
    RoomObjectCategory,
    RoomObjectVariable
} from '@octane/renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { FurniCategory, GetUseProductFurniData, LocalizeText, UseProductItem } from '../../../../api';
import { useProductRequestId } from '../../../../hooks/rooms/widgets/avatarInfo.products';
import { Button, LayoutPetImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useRoom } from '../../../../hooks';
import { BaseButton } from '../../../../common/BaseButton';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { HANDHELD_TOUCH_FRAME_SCALE } from '../../../../api/handheld/handheldWindowFit';

interface AvatarInfoUseProductConfirmViewProps {
    item: UseProductItem;
    onClose: () => void;
}

const PRODUCT_PAGE_UKNOWN: number = -1;
const PRODUCT_PAGE_SHAMPOO: number = 0;
const PRODUCT_PAGE_CUSTOM_PART: number = 1;
const PRODUCT_PAGE_CUSTOM_PART_SHAMPOO: number = 2;
const PRODUCT_PAGE_SADDLE: number = 3;
const PRODUCT_PAGE_REVIVE: number = 4;
const PRODUCT_PAGE_REBREED: number = 5;
const PRODUCT_PAGE_FERTILIZE: number = 6;

export const AvatarInfoUseProductConfirmView: FC<AvatarInfoUseProductConfirmViewProps> = (props) => {
    const { item = null, onClose = null } = props;
    const [mode, setMode] = useState(PRODUCT_PAGE_UKNOWN);
    const [petData, setPetData] = useState<IRoomUserData>(null);
    const [furniData, setFurniData] = useState<IFurnitureData>(null);
    const { roomSession = null } = useRoom();

    const selectRoomObject = () => {
        if (!petData) return;

        GetRoomEngine().selectRoomObject(roomSession.roomId, petData.roomIndex, RoomObjectCategory.UNIT);
    };

    const useProduct = () => {
        // A product used from the inventory is named by its inventory item id.
        roomSession.usePetProduct(useProductRequestId(item), petData.webID);

        onClose();
    };

    const getPetImage = useMemo(() => {
        if (!petData || !furniData) return null;

        const petFigureData = new PetFigureData(petData.figure);
        const customParts = furniData.customParams.split(' ');
        const petIndex = parseInt(customParts[0]);

        switch (furniData.specialType) {
            case FurniCategory.PET_SHAMPOO: {
                if (customParts.length < 2) return null;

                const currentPalette = GetRoomEngine().getPetColorResult(petIndex, petFigureData.paletteId);
                const possiblePalettes = GetRoomEngine().getPetColorResultsForTag(petIndex, customParts[1]);

                let paletteId = -1;

                for (const result of possiblePalettes) {
                    if (result.breed === currentPalette.breed) {
                        paletteId = parseInt(result.id);

                        break;
                    }
                }

                return (
                    <NativeTextTree>
                        <LayoutPetImageView
                            customParts={petFigureData.customParts}
                            direction={2}
                            paletteId={paletteId}
                            petColor={petFigureData.color}
                            typeId={petFigureData.typeId}
                        />
                    </NativeTextTree>
                );
            }
            case FurniCategory.PET_CUSTOM_PART: {
                if (customParts.length < 4) return null;

                const newCustomParts: IPetCustomPart[] = [];

                const _local_6 = customParts[1].split(',').map((piece) => parseInt(piece));
                const _local_7 = customParts[2].split(',').map((piece) => parseInt(piece));
                const _local_8 = customParts[3].split(',').map((piece) => parseInt(piece));

                let _local_10 = 0;

                while (_local_10 < _local_6.length) {
                    const _local_13 = _local_6[_local_10];
                    const _local_15 = petFigureData.getCustomPart(_local_13);

                    let _local_12 = _local_8[_local_10];

                    if (_local_15 != null) _local_12 = _local_15.paletteId;

                    newCustomParts.push(new PetCustomPart(_local_13, _local_7[_local_10], _local_12));

                    _local_10++;
                }

                return (
                    <NativeTextTree>
                        <LayoutPetImageView
                            customParts={newCustomParts}
                            direction={2}
                            paletteId={petFigureData.paletteId}
                            petColor={petFigureData.color}
                            typeId={petFigureData.typeId}
                        />
                    </NativeTextTree>
                );
            }
            case FurniCategory.PET_CUSTOM_PART_SHAMPOO: {
                if (customParts.length < 3) return null;

                const newCustomParts: IPetCustomPart[] = [];

                const _local_6 = customParts[1].split(',').map((piece) => parseInt(piece));
                const _local_8 = customParts[2].split(',').map((piece) => parseInt(piece));

                let _local_10 = 0;

                while (_local_10 < _local_6.length) {
                    const _local_13 = _local_6[_local_10];
                    const _local_15 = petFigureData.getCustomPart(_local_13);

                    let _local_14 = -1;

                    if (_local_15 != null) _local_14 = _local_15.partId;

                    newCustomParts.push(new PetCustomPart(_local_6[_local_10], _local_14, _local_8[_local_10]));

                    _local_10++;
                }

                return (
                    <NativeTextTree>
                        <LayoutPetImageView
                            customParts={newCustomParts}
                            direction={2}
                            paletteId={petFigureData.paletteId}
                            petColor={petFigureData.color}
                            typeId={petFigureData.typeId}
                        />
                    </NativeTextTree>
                );
            }
            case FurniCategory.PET_SADDLE: {
                if (customParts.length < 4) return null;

                const newCustomParts: IPetCustomPart[] = [];

                const _local_6 = customParts[1].split(',').map((piece) => parseInt(piece));
                const _local_7 = customParts[2].split(',').map((piece) => parseInt(piece));
                const _local_8 = customParts[3].split(',').map((piece) => parseInt(piece));

                let _local_10 = 0;

                while (_local_10 < _local_6.length) {
                    newCustomParts.push(new PetCustomPart(_local_6[_local_10], _local_7[_local_10], _local_8[_local_10]));

                    _local_10++;
                }

                for (const _local_21 of petFigureData.customParts) {
                    if (_local_6.indexOf(_local_21.layerId) === -1) {
                        newCustomParts.push(_local_21);
                    }
                }

                return (
                    <NativeTextTree>
                        <LayoutPetImageView
                            customParts={newCustomParts}
                            direction={2}
                            paletteId={petFigureData.paletteId}
                            petColor={petFigureData.color}
                            typeId={petFigureData.typeId}
                        />
                    </NativeTextTree>
                );
            }
            case FurniCategory.MONSTERPLANT_REBREED:
            case FurniCategory.MONSTERPLANT_REVIVAL:
            case FurniCategory.MONSTERPLANT_FERTILIZE: {
                let posture = 'rip';

                const roomObject = GetRoomEngine().getRoomObject(roomSession.roomId, petData.roomIndex, RoomObjectCategory.UNIT);

                if (roomObject) {
                    posture = roomObject.model.getValue<string>(RoomObjectVariable.FIGURE_POSTURE);

                    if (posture === 'rip') {
                        const level = petData.petLevel;

                        if (level < 7) posture = `grw${level}`;
                        else posture = 'std';
                    }
                }

                return (
                    <NativeTextTree>
                        <LayoutPetImageView
                            customParts={petFigureData.customParts}
                            direction={2}
                            paletteId={petFigureData.paletteId}
                            petColor={petFigureData.color}
                            posture={posture}
                            typeId={petFigureData.typeId}
                        />
                    </NativeTextTree>
                );
            }
        }
    }, [petData, furniData, roomSession]);

    useEffect(() => {
        const userData = roomSession.userDataManager.getUserDataByIndex(item.id);

        setPetData(userData);

        const furniData = GetUseProductFurniData(roomSession.roomId, item);

        if (!furniData) return;

        setFurniData(furniData);

        let mode = PRODUCT_PAGE_UKNOWN;

        switch (furniData.specialType) {
            case FurniCategory.PET_SHAMPOO:
                mode = PRODUCT_PAGE_SHAMPOO;
                break;
            case FurniCategory.PET_CUSTOM_PART:
                mode = PRODUCT_PAGE_CUSTOM_PART;
                break;
            case FurniCategory.PET_CUSTOM_PART_SHAMPOO:
                mode = PRODUCT_PAGE_CUSTOM_PART_SHAMPOO;
                break;
            case FurniCategory.PET_SADDLE:
                mode = PRODUCT_PAGE_SADDLE;
                break;
            case FurniCategory.MONSTERPLANT_REVIVAL:
                mode = PRODUCT_PAGE_REVIVE;
                break;
            case FurniCategory.MONSTERPLANT_REBREED:
                mode = PRODUCT_PAGE_REBREED;
                break;
            case FurniCategory.MONSTERPLANT_FERTILIZE:
                mode = PRODUCT_PAGE_FERTILIZE;
                break;
        }

        setMode(mode);
    }, [roomSession, item]);

    if (!petData) return null;

    const productName = furniData?.name ?? '';

    // AIR use_product_widget_frame_monsterplant* around use_product_{revive,rebreed,fertilize}_monsterplant (290 wide):
    // the plant with its name, rarity and owner in a 130 px column, the two texts in a second one, and a row of two
    // 130 x 30 buttons. The window has its own title and button caption per product.
    const plantCopy =
        mode === PRODUCT_PAGE_REVIVE
            ? { title: 'useproduct.widget.title.monsterplant', text: 'useproduct.widget.text.revive_monsterplant', info: 'useproduct.widget.info.revive_monsterplant', save: 'useproduct.widget.revive' }
            : mode === PRODUCT_PAGE_REBREED
              ? { title: 'useproduct.widget.title.monsterplant_rebreed', text: 'useproduct.widget.text.rebreed_monsterplant', info: 'useproduct.widget.info.rebreed_monsterplant', save: 'useproduct.widget.rebreed' }
              : mode === PRODUCT_PAGE_FERTILIZE
                ? { title: 'useproduct.widget.title.monsterplant_fertilize', text: 'useproduct.widget.text.fertilize_monsterplant', info: 'useproduct.widget.info.fertilize_monsterplant', save: 'useproduct.widget.fertilize' }
                : null;

    if (plantCopy) {
        return (
            <NativeTextTree>
                <OctaneCardView handheldScale={HANDHELD_TOUCH_FRAME_SCALE} className="octane-use-product-plant" isResizable={false}>
                    <OctaneCardHeaderView headerText={LocalizeText(plantCopy.title, ['name'], [petData.name])} onCloseClick={onClose} />
                    <OctaneCardContentView className="octane-use-product-plant__content" overflow="hidden">
                        <div className="octane-use-product-plant__columns">
                            <div className="octane-use-product-plant__plant">
                                <div className="octane-use-product-plant__line">{LocalizeText('useproduct.widget.monsterplant.plant.name', ['name'], [petData.name])}</div>
                                <BaseButton type="button" className="octane-use-product-plant__preview" onClick={selectRoomObject}>
                                    {getPetImage}
                                </BaseButton>
                                <div className="octane-use-product-plant__line">
                                    {LocalizeText('useproduct.widget.monsterplant.plant.raritylevel', ['level'], [String(petData.rarityLevel ?? 0)])}
                                </div>
                                <div className="octane-use-product-plant__line">
                                    {LocalizeText('useproduct.widget.monsterplant.plant.description', ['name'], [petData.ownerName ?? ''])}
                                </div>
                            </div>
                            <div className="octane-use-product-plant__texts">
                                <div className="octane-use-product-plant__description">{LocalizeText(plantCopy.text, ['productName'], [productName])}</div>
                                <div className="octane-use-product-plant__info">{LocalizeText(plantCopy.info)}</div>
                            </div>
                        </div>
                        <div className="octane-use-product-plant__buttons">
                            <Button variant="secondary" onClick={onClose}>
                                {LocalizeText('useproduct.widget.cancel')}
                            </Button>
                            <Button variant="success" onClick={useProduct}>
                                {LocalizeText(plantCopy.save)}
                            </Button>
                        </div>
                    </OctaneCardContentView>
                </OctaneCardView>
            </NativeTextTree>
        );
    }

    const horseCopy =
        mode === PRODUCT_PAGE_SHAMPOO
            ? 'shampoo'
            : mode === PRODUCT_PAGE_CUSTOM_PART
              ? 'custompart'
              : mode === PRODUCT_PAGE_CUSTOM_PART_SHAMPOO
                ? 'custompartshampoo'
                : mode === PRODUCT_PAGE_SADDLE
                  ? 'saddle'
                  : null;

    // AIR use_product_widget_frame (388 wide) around use_product_{shampoo,custom_part,custom_part_shampoo,saddle}
    // (386 x 180): the preview at 10,10, the two wrapped texts 200 wide at x 140, the underlined cancel link and the
    // thick Use button on one line. The same geometry as the plant seed window.
    return (
        <NativeTextTree>
            <OctaneCardView handheldScale={HANDHELD_TOUCH_FRAME_SCALE} className="octane-plant-seed-confirm octane-use-product-horse" isResizable={false}>
                <OctaneCardHeaderView headerText={LocalizeText('useproduct.widget.title', ['name'], [petData.name])} onCloseClick={onClose} />
                <OctaneCardContentView className="octane-plant-seed-confirm__content" overflow="hidden">
                    <BaseButton type="button" className="octane-plant-seed-confirm__preview octane-use-product-horse__preview" onClick={selectRoomObject}>
                        {getPetImage}
                    </BaseButton>
                    {horseCopy && (
                        <>
                            <div className="octane-plant-seed-confirm__description">{LocalizeText(`useproduct.widget.text.${horseCopy}`, ['productName'], [productName])}</div>
                            <div className="octane-plant-seed-confirm__info">{LocalizeText(`useproduct.widget.info.${horseCopy}`)}</div>
                        </>
                    )}
                    <BaseButton className="octane-plant-seed-confirm__cancel" onClick={onClose}>
                        {LocalizeText('useproduct.widget.cancel')}
                    </BaseButton>
                    <Button className="octane-plant-seed-confirm__save" variant="success" onClick={useProduct}>
                        {LocalizeText('useproduct.widget.use')}
                    </Button>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
