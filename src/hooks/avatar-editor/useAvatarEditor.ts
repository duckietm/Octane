import {
    AvatarEditorFigureCategory,
    AvatarFigureContainer,
    AvatarFigurePartType,
    FigureSetIdsMessageEvent,
    GetAvatarRenderManager,
    GetSessionDataManager,
    GetWardrobeMessageComposer,
    IAvatarFigureContainer,
    IFigurePartSet,
    IPalette,
    IPartColor,
    SetType,
    UserWardrobePageEvent
} from '@octane/renderer';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { registerSharedHook, useSharedHook } from '@/state/useSharedHook';
import {
    AvatarEditorColorSorter,
    AvatarEditorPartSorter,
    CreateLinkEvent,
    GetClubMemberLevel,
    GetConfigurationValue,
    IAvatarEditorCategory,
    IAvatarEditorCategoryPartItem,
    IsNftAvatarPartSet,
    Randomizer,
    SendMessageComposer
} from '../../api';
import { useMessageEvent } from '../events';
import { useFigureData } from './useFigureData';

const MAX_PALETTES: number = 2;

const FOOTBALL_GATE_PART_IDS: { [setType: string]: number[] } = {
    [AvatarFigurePartType.CHEST]: [3111, 3110, 3109, 3030, 3114, 266, 265, 262, 3113, 3112, 691, 690, 667],
    [AvatarFigurePartType.CHEST_PRINT]: [3128, 3127, 3126, 3125, 3124, 3123, 3122, 3121, 3120, 3119],
    [AvatarFigurePartType.LEGS]: [3116, 281, 275, 715, 700, 696, 3006],
    [AvatarFigurePartType.SHOES]: [3115, 3068, 906]
};
const DEFAULT_MALE_FOOTBALL_GATE: string = 'ch-3109-92-1408.lg-3116-82-1408.sh-3115-1408-1408';
const DEFAULT_FEMALE_FOOTBALL_GATE: string = 'ch-3112-1408-1408.lg-3116-71-1408.sh-3115-1408-1408';

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
                const partColor = activeModel
                    .find((category) => category.setType === setType)
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

            const category = activeModel.find((category) => category.setType === setType);

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

            const category = activeModel.find((category) => category.setType === setType);

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
        const buildModeDefault = 'default';
        const buildModeNft = 'nft';

        const buildCategory = (setType: string, buildMode: string = buildModeDefault, allowedPartIds: number[] = null) => {
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

                if (allowedPartIds) {
                    if (allowedPartIds.indexOf(partSet.id) === -1) continue;

                    let maxPaletteCount = 0;

                    for (const part of partSet.parts) maxPaletteCount = Math.max(maxPaletteCount, part.colorLayerIndex);

                    partItems.push({ id: partSet.id, partSet, usesColor, maxPaletteCount, isSellableNotOwned: false });

                    continue;
                }

                const isNftPartSet = IsNftAvatarPartSet(partSet, nftFigureSetIds, (candidate) =>
                    GetAvatarRenderManager().downloadManager.isNftPartSet(candidate)
                );

                if (buildMode === buildModeDefault && isNftPartSet) continue;
                if (buildMode === buildModeNft && !isNftPartSet) continue;

                const isSellableNotOwned = partSet.isSellable && figureSetIds.indexOf(partSet.id) === -1;

                if (isSellableNotOwned && buildMode !== buildModeNft && setType !== AvatarFigurePartType.PET) continue;

                let maxPaletteCount = 0;

                for (const part of partSet.parts) maxPaletteCount = Math.max(maxPaletteCount, part.colorLayerIndex);

                partItems.push({ id: partSet.id, partSet, usesColor, maxPaletteCount, isSellableNotOwned });
            }

            partItems.sort(AvatarEditorPartSorter(false));

            for (let i = 0; i < MAX_PALETTES; i++) colorItems[i].sort(AvatarEditorColorSorter);

            return { setType, partItems, colorItems };
        };

        if (clothingChangeData) {
            newAvatarModels[AvatarEditorFigureCategory.TORSO] = [AvatarFigurePartType.CHEST, AvatarFigurePartType.CHEST_PRINT]
                .map((setType) => buildCategory(setType, buildModeDefault, FOOTBALL_GATE_PART_IDS[setType]))
                .filter(Boolean);
            newAvatarModels[AvatarEditorFigureCategory.LEGS] = [AvatarFigurePartType.LEGS, AvatarFigurePartType.SHOES]
                .map((setType) => buildCategory(setType, buildModeDefault, FOOTBALL_GATE_PART_IDS[setType]))
                .filter(Boolean);

            setAvatarModels(newAvatarModels);
            setActiveModelKey(AvatarEditorFigureCategory.TORSO);

            return;
        }

        newAvatarModels[AvatarEditorFigureCategory.GENERIC] = [AvatarFigurePartType.HEAD].map((setType) => buildCategory(setType, buildModeDefault));
        newAvatarModels[AvatarEditorFigureCategory.HEAD] = [
            AvatarFigurePartType.HAIR,
            AvatarFigurePartType.HEAD_ACCESSORY,
            AvatarFigurePartType.HEAD_ACCESSORY_EXTRA,
            AvatarFigurePartType.EYE_ACCESSORY,
            AvatarFigurePartType.FACE_ACCESSORY
        ].map((setType) => buildCategory(setType, buildModeDefault));
        newAvatarModels[AvatarEditorFigureCategory.TORSO] = [
            AvatarFigurePartType.CHEST,
            AvatarFigurePartType.CHEST_PRINT,
            AvatarFigurePartType.COAT_CHEST,
            AvatarFigurePartType.CHEST_ACCESSORY
        ].map((setType) => buildCategory(setType, buildModeDefault));
        newAvatarModels[AvatarEditorFigureCategory.LEGS] = [AvatarFigurePartType.LEGS, AvatarFigurePartType.SHOES, AvatarFigurePartType.WAIST_ACCESSORY].map(
            (setType) => buildCategory(setType, buildModeDefault)
        );
        newAvatarModels[AvatarEditorFigureCategory.PETS] = [AvatarFigurePartType.PET].map((setType) => buildCategory(setType)).filter(Boolean);
        newAvatarModels[AvatarEditorFigureCategory.MISC] = [AvatarFigurePartType.MISC].map((setType) => buildCategory(setType)).filter(Boolean);
        newAvatarModels[AvatarEditorFigureCategory.NFT] = [
            AvatarFigurePartType.HEAD,
            AvatarFigurePartType.HAIR,
            AvatarFigurePartType.HEAD_ACCESSORY,
            AvatarFigurePartType.HEAD_ACCESSORY_EXTRA,
            AvatarFigurePartType.EYE_ACCESSORY,
            AvatarFigurePartType.FACE_ACCESSORY,
            AvatarFigurePartType.CHEST,
            AvatarFigurePartType.CHEST_PRINT,
            AvatarFigurePartType.COAT_CHEST,
            AvatarFigurePartType.CHEST_ACCESSORY,
            AvatarFigurePartType.LEGS,
            AvatarFigurePartType.SHOES,
            AvatarFigurePartType.WAIST_ACCESSORY
        ]
            .map((setType) => buildCategory(setType, buildModeNft))
            .filter(Boolean);
        newAvatarModels[AvatarEditorFigureCategory.WARDROBE] = [];

        setAvatarModels(newAvatarModels);
        setActiveModelKey(AvatarEditorFigureCategory.GENERIC);
    }, [isVisible, gender, figureSetIds, nftFigureSetIds, clothingChangeData]);

    useEffect(() => {
        if (!isVisible) return;

        if (clothingChangeData) {
            loadAvatarData(
                clothingChangeData.gender === AvatarFigurePartType.MALE ? DEFAULT_MALE_FOOTBALL_GATE : DEFAULT_FEMALE_FOOTBALL_GATE,
                clothingChangeData.gender
            );

            return;
        }

        loadAvatarData(GetSessionDataManager().figure, GetSessionDataManager().gender);
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
        loadAvatarData,
        getFigureString,
        getFigureStringWithFace,
        selectedParts,
        gender,
        setGender,
        figureSetIds,
        randomizeCurrentFigure,
        savedFigures,
        setSavedFigures,
        getFirstSelectableColor
    };
};

export const useAvatarEditor = () => useSharedHook(useAvatarEditorState);

registerSharedHook(useAvatarEditorState);
