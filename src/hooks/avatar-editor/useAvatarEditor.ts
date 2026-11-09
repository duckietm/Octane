import {
    AvatarEditorFigureCategory,
    AvatarFigureContainer,
    AvatarFigurePartType,
    FigureSetIdsMessageEvent,
    GetAvatarRenderManager,
    GetRoomEngine,
    GetSessionDataManager,
    GetWardrobeMessageComposer,
    IAvatarFigureContainer,
    IFigurePartSet,
    IPalette,
    IPartColor,
    RoomObjectCategory,
    RoomObjectVariable,
    SetType,
    UserWardrobePageEvent
} from '@octane/renderer';
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    AvatarEditorColorSorter,
    AvatarEditorPartSorter,
    CreateLinkEvent,
    DEFAULT_FEMALE_FIGURE,
    DEFAULT_MALE_FIGURE,
    GetClubMemberLevel,
    GetConfigurationValue,
    getFootballGateLook,
    IAvatarEditorCategory,
    IAvatarEditorCategoryPartItem,
    Randomizer,
    sanitizeAvatarFigure,
    SendMessageComposer
} from '../../api';
import { useMessageEvent } from '../events';
import { useFigureData } from './useFigureData';

const MAX_PALETTES: number = 2;

const TORSO_SET_TYPES: string[] = [
    AvatarFigurePartType.CHEST,
    AvatarFigurePartType.CHEST_PRINT,
    AvatarFigurePartType.COAT_CHEST,
    AvatarFigurePartType.CHEST_ACCESSORY
];
const LEGS_SET_TYPES: string[] = [AvatarFigurePartType.LEGS, AvatarFigurePartType.SHOES, AvatarFigurePartType.WAIST_ACCESSORY];

/** The look a football gate stored for `gender`, or AIR's default (FurnitureClothingChangeWidgetHandler). */
const readFootballGateLook = (objectId: number, gender: string): string => {
    const roomObject = GetRoomEngine().getRoomObject(GetRoomEngine().activeRoomId, objectId, RoomObjectCategory.FLOOR);
    const model = roomObject?.model;

    return getFootballGateLook(
        gender,
        model?.getValue<string>(RoomObjectVariable.FURNITURE_CLOTHING_BOY),
        model?.getValue<string>(RoomObjectVariable.FURNITURE_CLOTHING_GIRL)
    );
};

export interface IClothingChangeData {
    objectId: number;
    gender: string;
}

const useAvatarEditorState = () => {
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [clothingChangeData, setClothingChangeData] = useState<IClothingChangeData>(null);
    const [avatarModels, setAvatarModels] = useState<{ [index: string]: IAvatarEditorCategory[] }>({});
    const [activeModelKey, setActiveModelKey] = useState<string>('');
    const [maxPaletteCount, setMaxPaletteCount] = useState<number>(1);
    const [figureSetIds, setFigureSetIds] = useState<number[]>([]);
    const [boundFurnitureNames, setBoundFurnitureNames] = useState<string[]>([]);
    const [figureSetNames, setFigureSetNames] = useState<Record<number, string>>({});
    const [savedFigures, setSavedFigures] = useState<[IAvatarFigureContainer, string][]>(null);
    const { selectedColors, gender, setGender, loadAvatarData, selectPart, selectColor, getFigureString, getFigureStringWithFace, selectedParts } =
        useFigureData();

    const activeModel = useMemo(() => avatarModels[activeModelKey] ?? null, [activeModelKey, avatarModels]);

    const selectedColorParts = useMemo(() => {
        const colorSets: { [index: string]: IPartColor[] } = {};

        for (const setType of Object.keys(selectedColors)) {
            if (!selectedColors[setType]) continue;

            const parts: IPartColor[] = [];

            for (const paletteId of Object.keys(selectedColors[setType])) {
                // No figure model while a non-clothing tab (effects) is open.
                const partColor = activeModel
                    ?.find((category) => category.setType === setType)
                    ?.colorItems[paletteId]?.find((partColor) => partColor.id === selectedColors[setType][paletteId]);

                if (partColor) parts.push(partColor);
            }

            colorSets[setType] = parts;
        }

        return colorSets;
    }, [activeModel, selectedColors]);

    const selectEditorPart = useCallback(
        (setType: string, partId: number) => {
            if (!setType || !setType.length) return;

            const category = activeModel?.find((category) => category.setType === setType);

            if (!category || !category.partItems || !category.partItems.length) return;

            const partItem = category.partItems.find((partItem) => partItem.id === partId);

            if (!partItem) return;

            if (partItem.isClear) {
                selectPart(setType, -1);

                return;
            }

            if (GetClubMemberLevel() < partItem.partSet.clubLevel) {
                CreateLinkEvent('habboUI/open/hccenter');

                return;
            }

            if (partItem.isSellableNotOwned) return;

            setMaxPaletteCount(partItem.maxPaletteCount || 1);

            selectPart(setType, partId);

            if (setType === AvatarFigurePartType.PET) selectPart(AvatarFigurePartType.MISC, -1);
            else if (setType === AvatarFigurePartType.MISC) selectPart(AvatarFigurePartType.PET, -1);
        },
        [activeModel, selectPart]
    );

    const selectEditorColor = useCallback(
        (setType: string, paletteId: number, colorId: number) => {
            if (!setType || !setType.length) return;

            const category = activeModel?.find((category) => category.setType === setType);

            if (!category || !category.colorItems || !category.colorItems.length) return;

            const palette = category.colorItems[paletteId];

            if (!palette || !palette.length) return;

            const partColor = palette.find((partColor) => partColor.id === colorId);

            if (!partColor) return;

            if (GetClubMemberLevel() < partColor.clubLevel) return;

            selectColor(setType, paletteId, colorId);
        },
        [activeModel, selectColor]
    );

    const getFirstSelectableColor = useCallback((setType: string) => {
        const set = GetAvatarRenderManager().structureData.getSetType(setType);

        if (!setType) return -1;

        const palette = GetAvatarRenderManager().structureData.getPalette(set.paletteID);

        if (!palette) return -1;

        for (const color of palette.colors.getValues()) {
            if (!color.isSelectable || GetClubMemberLevel() < color.clubLevel) continue;

            return color.id;
        }

        return -1;
    }, []);

    const randomizeCurrentFigure = useCallback(
        (ignoredSets: string[] = []) => {
            const structure = GetAvatarRenderManager().structure;
            const figureContainer = new AvatarFigureContainer('');

            const getRandomSetTypes = (requiredSets: string[], options: string[]) => {
                options = options.filter((option) => requiredSets.indexOf(option) === -1);

                return [...requiredSets, ...Randomizer.getRandomElements(options, Randomizer.getRandomNumber(options.length) + 1)];
            };

            const requiredSets = getRandomSetTypes(structure.getMandatorySetTypeIds(gender, GetClubMemberLevel()), AvatarFigurePartType.FIGURE_SETS);

            const getRandomPartSet = (setType: SetType, gender: string, clubLevel: number, figureSetIds: number[]) => {
                const options = setType.partSets.getValues().filter((option) => {
                    if (
                        !option.isSelectable ||
                        (option.gender !== 'U' && option.gender !== gender) ||
                        option.clubLevel > clubLevel ||
                        (option.isSellable && figureSetIds.indexOf(option.id) === -1)
                    )
                        return null;

                    return option;
                });

                if (!options || !options.length) return null;

                return Randomizer.getRandomElement(options);
            };

            const getRandomColors = (palette: IPalette, partSet: IFigurePartSet, clubLevel: number) => {
                const options = palette.colors.getValues().filter((option) => {
                    if (!option.isSelectable || option.clubLevel > clubLevel) return null;

                    return option;
                });

                if (!options || !options.length) return null;

                const getTotalColors = (partSet: IFigurePartSet) => {
                    const parts = partSet.parts;

                    let totalColors = 0;

                    for (const part of parts) totalColors = Math.max(totalColors, part.colorLayerIndex);

                    return totalColors;
                };

                return Randomizer.getRandomElements(options, getTotalColors(partSet));
            };

            for (const setType of ignoredSets) {
                const partSetId = selectedParts[setType];
                const colors = selectedColors[setType];

                figureContainer.updatePart(setType, partSetId, colors);
            }

            for (const type of requiredSets) {
                if (figureContainer.hasPartType(type)) continue;

                const setType = structure.figureData.getSetType(type) as SetType;
                const selectedSet = getRandomPartSet(setType, gender, GetClubMemberLevel(), figureSetIds);

                if (!selectedSet) continue;

                let selectedColors: number[] = [];

                if (selectedSet.isColorable) {
                    selectedColors = getRandomColors(structure.figureData.getPalette(setType.paletteID), selectedSet, GetClubMemberLevel()).map(
                        (color) => color.id
                    );
                }

                figureContainer.updatePart(setType.type, selectedSet.id, selectedColors);
            }

            loadAvatarData(figureContainer.getFigureString(), gender);
        },
        [figureSetIds, gender, loadAvatarData, selectedColors, selectedParts]
    );

    const nftFigureSetIds = useMemo(() => {
        const nftSetIds = new Set<number>();

        for (const [setId, furnitureName] of Object.entries(figureSetNames)) {
            if (!furnitureName?.toLowerCase().includes('nft')) continue;

            nftSetIds.add(Number(setId));
        }

        return nftSetIds;
    }, [figureSetNames]);

    // Habbo strips what the user can't wear (club level, unowned sellables, other gender) from any look it loads.
    const sanitizeFigure = useCallback(
        (figure: string, forGender: string) => {
            const clubLevel = GetClubMemberLevel();

            return sanitizeAvatarFigure(figure, GetAvatarRenderManager().structureData, {
                gender: forGender,
                clubLevel,
                ownedSetIds: [...figureSetIds, ...Array.from(nftFigureSetIds)],
                mandatorySetTypes: GetAvatarRenderManager().getMandatoryAvatarPartSetIds(forGender, clubLevel)
            });
        },
        [figureSetIds, nftFigureSetIds]
    );

    const loadValidAvatarData = useCallback(
        (figure: string, forGender: string) => loadAvatarData(sanitizeFigure(figure, forGender), forGender),
        [loadAvatarData, sanitizeFigure]
    );

    // One look per gender, like Habbo: switching shows the other gender's own look (or its default).
    const figuresByGenderRef = useRef<Record<string, string>>({});

    const switchGender = useCallback(
        (newGender: string) => {
            if (!newGender || newGender === gender) return;

            figuresByGenderRef.current[gender] = getFigureString;

            const nextFigure = figuresByGenderRef.current[newGender] ?? (newGender === AvatarFigurePartType.FEMALE ? DEFAULT_FEMALE_FIGURE : DEFAULT_MALE_FIGURE);

            loadValidAvatarData(nextFigure, newGender);
        },
        [gender, getFigureString, loadValidAvatarData]
    );

    // Read through an effect event so a later figure set update doesn't reset the edit.
    const loadOwnFigure = useEffectEvent(() => loadValidAvatarData(GetSessionDataManager().figure, GetSessionDataManager().gender));

    const getValidFigureString = useMemo(() => sanitizeFigure(getFigureString, gender), [getFigureString, gender, sanitizeFigure]);

    useMessageEvent<FigureSetIdsMessageEvent>(FigureSetIdsMessageEvent, (event) => {
        const parser = event.getParser();

        setFigureSetIds(parser.figureSetIds);
        setBoundFurnitureNames(parser.boundsFurnitureNames);
        setFigureSetNames(parser.figureSetNameMap);
    });

    useMessageEvent<UserWardrobePageEvent>(UserWardrobePageEvent, (event) => {
        const parser = event.getParser();
        const savedFigures: [IAvatarFigureContainer, string][] = [];

        let i = 0;

        while (i < GetConfigurationValue<number>('avatar.wardrobe.max.slots', 10)) {
            savedFigures.push([null, null]);

            i++;
        }

        for (let [index, [look, gender]] of parser.looks.entries()) {
            const container = GetAvatarRenderManager().createFigureContainer(look);

            savedFigures[index - 1] = [container, gender];
        }

        setSavedFigures(savedFigures);
    });

    useEffect(() => {
        if (!isVisible) return;

        const newAvatarModels: { [index: string]: IAvatarEditorCategory[] } = {};
        const buildCategory = (setType: string) => {
            const partItems: IAvatarEditorCategoryPartItem[] = [];
            const colorItems: IPartColor[][] = [];

            for (let i = 0; i < MAX_PALETTES; i++) colorItems.push([]);

            const set = GetAvatarRenderManager().structureData.getSetType(setType);

            if (!set) return null;

            const palette = GetAvatarRenderManager().structureData.getPalette(set.paletteID);

            if (!palette) return null;

            for (const partColor of palette.colors.getValues()) {
                if (!partColor || !partColor.isSelectable) continue;

                for (let i = 0; i < MAX_PALETTES; i++) colorItems[i].push(partColor);
            }

            let mandatorySetIds: string[] = GetAvatarRenderManager().getMandatoryAvatarPartSetIds(gender, GetClubMemberLevel());

            const isntMandatorySet = mandatorySetIds.indexOf(setType) === -1;

            if (isntMandatorySet) partItems.push({ id: -1, isClear: true });

            const usesColor = setType !== AvatarFigurePartType.HEAD;
            const partSets = set.partSets;

            for (let i = partSets.length; i >= 0; i--) {
                const partSet = partSets.getWithIndex(i);

                if (!partSet || !partSet.isSelectable || (partSet.gender !== gender && partSet.gender !== AvatarFigurePartType.UNISEX)) continue;

                const isSellableNotOwned = partSet.isSellable && figureSetIds.indexOf(partSet.id) === -1;

                const showUnownedSellables = GetConfigurationValue<boolean>('avatareditor.show.unowned.sellables', false);

                if (isSellableNotOwned && !showUnownedSellables && setType !== AvatarFigurePartType.PET) continue;

                let maxPaletteCount = 0;

                for (const part of partSet.parts) maxPaletteCount = Math.max(maxPaletteCount, part.colorLayerIndex);

                partItems.push({ id: partSet.id, partSet, usesColor, maxPaletteCount, isSellableNotOwned });
            }

            partItems.sort(AvatarEditorPartSorter(false));

            for (let i = 0; i < MAX_PALETTES; i++) colorItems[i].sort(AvatarEditorColorSorter);

            return { setType, partItems, colorItems };
        };

        if (clothingChangeData) {
            newAvatarModels[AvatarEditorFigureCategory.TORSO] = TORSO_SET_TYPES.map(buildCategory).filter(Boolean);
            newAvatarModels[AvatarEditorFigureCategory.LEGS] = LEGS_SET_TYPES.map(buildCategory).filter(Boolean);

            setAvatarModels(newAvatarModels);
            setActiveModelKey(AvatarEditorFigureCategory.TORSO);

            return;
        }

        newAvatarModels[AvatarEditorFigureCategory.GENERIC] = [AvatarFigurePartType.HEAD].map(buildCategory);
        newAvatarModels[AvatarEditorFigureCategory.HEAD] = [
            AvatarFigurePartType.HAIR,
            AvatarFigurePartType.HEAD_ACCESSORY,
            AvatarFigurePartType.HEAD_ACCESSORY_EXTRA,
            AvatarFigurePartType.EYE_ACCESSORY,
            AvatarFigurePartType.FACE_ACCESSORY
        ].map(buildCategory);
        newAvatarModels[AvatarEditorFigureCategory.TORSO] = TORSO_SET_TYPES.map(buildCategory);
        newAvatarModels[AvatarEditorFigureCategory.LEGS] = LEGS_SET_TYPES.map(buildCategory);
        newAvatarModels[AvatarEditorFigureCategory.PETS] = [AvatarFigurePartType.PET].map((setType) => buildCategory(setType)).filter(Boolean);
        newAvatarModels[AvatarEditorFigureCategory.MISC] = [AvatarFigurePartType.MISC].map((setType) => buildCategory(setType)).filter(Boolean);
        // AIR NftAvatarsModel: the NFT tab lists collectible looks (useNftWardrobe), not clothing parts.
        newAvatarModels[AvatarEditorFigureCategory.NFT] = [];
        newAvatarModels[AvatarEditorFigureCategory.WARDROBE] = [];

        setAvatarModels(newAvatarModels);
        setActiveModelKey(AvatarEditorFigureCategory.GENERIC);
    }, [isVisible, gender, figureSetIds, clothingChangeData]);

    useEffect(() => {
        if (!isVisible) return;

        if (clothingChangeData) {
            loadAvatarData(readFootballGateLook(clothingChangeData.objectId, clothingChangeData.gender), clothingChangeData.gender);

            return;
        }

        figuresByGenderRef.current = {};
        loadOwnFigure();
    }, [isVisible, loadAvatarData, clothingChangeData]);

    useEffect(() => {
        if (!isVisible || savedFigures) return;

        setSavedFigures(new Array(GetConfigurationValue<number>('avatar.wardrobe.max.slots', 10)));
        SendMessageComposer(new GetWardrobeMessageComposer());
    }, [isVisible, savedFigures]);

    return {
        isVisible,
        setIsVisible,
        clothingChangeData,
        setClothingChangeData,
        avatarModels,
        activeModelKey,
        setActiveModelKey,
        maxPaletteCount,
        selectedColorParts,
        selectEditorColor,
        selectEditorPart,
        loadAvatarData: loadValidAvatarData,
        // A collectible look (avatar editor NFT tab) loads as the server stores it: its parts come with the token.
        loadOutfitFigure: loadAvatarData,
        getFigureString,
        getValidFigureString,
        getFigureStringWithFace,
        selectedParts,
        gender,
        setGender: switchGender,
        figureSetIds,
        randomizeCurrentFigure,
        savedFigures,
        setSavedFigures,
        getFirstSelectableColor
    };
};

export const useAvatarEditor = () => useSharedHook(useAvatarEditorState);

registerSharedHook(useAvatarEditorState);
