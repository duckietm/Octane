import {
    BreedingPetInfo,
    CancelPetBreedingComposer,
    ConfirmBreedingRequestEvent,
    ConfirmBreedingResultEvent,
    ConfirmPetBreedingComposer,
    NestBreedingSuccessEvent,
    PetBreedingMessageEvent,
    PetBreedingResultEvent,
    PetBreedingResultData,
    RarityCategoryData
} from '@octane/renderer';
import { useState } from 'react';
import { SendMessageComposer } from '../../../api';
import { useMessageEvent } from '../../events';

/**
 * The official pet breeding flow (AIR 13), as `RoomUsersHandler` / `AvatarInfoWidget` run it:
 *
 * - `ConfirmBreedingRequest` opens the naming dialog with both parents and the rarity odds,
 * - `ConfirmPetBreeding` / `CancelPetBreeding` answer it,
 * - `ConfirmBreedingResult` closes it or explains why it could not be done,
 * - `NestBreedingSuccess` announces the offspring the nest produced,
 * - `PetBreedingResult` reports the outcome of breeding two monsterplants,
 * - `PetBreedingMessage` drives the monsterplant confirmation between two owners.
 */

/** Official `ConfirmBreedingResultParser` result codes. */
export const PET_BREEDING_RESULT_OK = 0;
export const PET_BREEDING_RESULT_NO_NEST = 1;
export const PET_BREEDING_RESULT_PETS_MISSING = 2;
export const PET_BREEDING_RESULT_NAME_INVALID = 3;

/** Official `PetBreedingMessageParser` states. */
export const PET_BREEDING_STATE_CANCEL = 1;
export const PET_BREEDING_STATE_ACCEPT = 2;
export const PET_BREEDING_STATE_REQUEST = 3;

export interface PetBreedingRequest {
    nestId: number;
    pet1: BreedingPetInfo;
    pet2: BreedingPetInfo;
    rarityCategories: RarityCategoryData[];
    resultPetType: number;
}

export interface PetBreedingOutcome {
    resultData: PetBreedingResultData;
    otherResultData: PetBreedingResultData;
}

export interface PetBreedingNestSuccess {
    petId: number;
    rarityCategory: number;
}

export interface PetBreedingConfirmation {
    ownPetId: number;
    otherPetId: number;
    /** The official passes `true` for state 3 (this client asked) and `false` for state 0. */
    isRequester: boolean;
}

const usePetBreedingWidgetState = () => {
    const [request, setRequest] = useState<PetBreedingRequest>(null);
    const [requestFailure, setRequestFailure] = useState<number>(-1);
    const [nestSuccess, setNestSuccess] = useState<PetBreedingNestSuccess>(null);
    const [outcome, setOutcome] = useState<PetBreedingOutcome>(null);
    const [confirmation, setConfirmation] = useState<PetBreedingConfirmation>(null);

    const confirmBreeding = (name: string) => {
        if (!request) return;

        SendMessageComposer(new ConfirmPetBreedingComposer(request.nestId, name, request.pet1.webId, request.pet2.webId));
    };

    const cancelBreeding = () => {
        if (!request) return;

        SendMessageComposer(new CancelPetBreedingComposer(request.nestId));
        setRequest(null);
    };

    useMessageEvent<ConfirmBreedingRequestEvent>(ConfirmBreedingRequestEvent, (event) => {
        const parser = event.getParser();

        setRequestFailure(-1);
        setRequest({
            nestId: parser.nestId,
            pet1: parser.pet1,
            pet2: parser.pet2,
            rarityCategories: parser.rarityCategories,
            resultPetType: parser.resultPetType
        });
    });

    useMessageEvent<ConfirmBreedingResultEvent>(ConfirmBreedingResultEvent, (event) => {
        const parser = event.getParser();

        // Official: only an invalid name keeps the dialog open, re-enabled for another try.
        if (parser.result === PET_BREEDING_RESULT_NAME_INVALID) {
            setRequestFailure(parser.result);

            return;
        }

        setRequestFailure(parser.result === PET_BREEDING_RESULT_OK ? -1 : parser.result);
        setRequest(null);
    });

    useMessageEvent<NestBreedingSuccessEvent>(NestBreedingSuccessEvent, (event) => {
        const parser = event.getParser();

        setNestSuccess({ petId: parser.petId, rarityCategory: parser.rarityCategory });
    });

    useMessageEvent<PetBreedingResultEvent>(PetBreedingResultEvent, (event) => {
        const parser = event.getParser();

        setOutcome({ resultData: parser.resultData, otherResultData: parser.otherResultData });
    });

    useMessageEvent<PetBreedingMessageEvent>(PetBreedingMessageEvent, (event) => {
        const parser = event.getParser();

        switch (parser.state) {
            case PET_BREEDING_STATE_CANCEL:
            case PET_BREEDING_STATE_ACCEPT:
                setConfirmation(null);

                return;
            case PET_BREEDING_STATE_REQUEST:
                setConfirmation({ ownPetId: parser.ownPetId, otherPetId: parser.otherPetId, isRequester: true });

                return;
            default:
                setConfirmation({ ownPetId: parser.ownPetId, otherPetId: parser.otherPetId, isRequester: false });
        }
    });

    return {
        request,
        requestFailure,
        nestSuccess,
        outcome,
        confirmation,
        confirmBreeding,
        cancelBreeding,
        dismissRequestFailure: () => setRequestFailure(-1),
        dismissNestSuccess: () => setNestSuccess(null),
        dismissOutcome: () => setOutcome(null),
        dismissConfirmation: () => setConfirmation(null)
    };
};

export const usePetBreedingWidget = usePetBreedingWidgetState;
