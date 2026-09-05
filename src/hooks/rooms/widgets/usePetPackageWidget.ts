import { GetRoomEngine, OpenPetPackageMessageComposer, RoomObjectCategory, RoomSessionPetPackageEvent } from '@octane/renderer';
import { useReducer } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../api';
import { useOctaneEvent } from '../../events';

interface PetPackageState {
    isVisible: boolean;
    objectId: number;
    objectType: string;
    petName: string;
    errorResult: string;
}

type PetPackageAction =
    | { type: 'open'; objectId: number; objectType: string }
    | { type: 'close' }
    | { type: 'set-name'; petName: string }
    | { type: 'set-error'; errorResult: string };

const INITIAL_STATE: PetPackageState = {
    isVisible: false,
    objectId: -1,
    objectType: '',
    petName: '',
    errorResult: ''
};

const petPackageReducer = (state: PetPackageState, action: PetPackageAction): PetPackageState => {
    switch (action.type) {
        case 'open':
            return { ...INITIAL_STATE, isVisible: true, objectId: action.objectId, objectType: action.objectType };
        case 'close':
            return INITIAL_STATE;
        case 'set-name':
            // Typing into the input always clears any previous error label.
            return { ...state, petName: action.petName, errorResult: '' };
        case 'set-error':
            return { ...state, errorResult: action.errorResult };
    }
};

/**
 * Maps the pet-package name-validation error code returned by the
 * server to a localized error label. Exported for testability — the
 * mapping is server-protocol contract, not UI state.
 */
export const getPetPackageNameError = (errorCode: number): string => {
    if (!errorCode) return '';

    switch (errorCode) {
        case 1:
            return LocalizeText('catalog.alert.petname.long');
        case 2:
            return LocalizeText('catalog.alert.petname.short');
        case 3:
            return LocalizeText('catalog.alert.petname.chars');
        case 4:
        default:
            return LocalizeText('catalog.alert.petname.bobba');
    }
};

const usePetPackageWidgetState = () => {
    const [state, dispatch] = useReducer(petPackageReducer, INITIAL_STATE);

    const onClose = () => dispatch({ type: 'close' });
    const onConfirm = () => SendMessageComposer(new OpenPetPackageMessageComposer(state.objectId, state.petName));
    const onChangePetName = (petName: string) => dispatch({ type: 'set-name', petName });

    useOctaneEvent<RoomSessionPetPackageEvent>(RoomSessionPetPackageEvent.RSOPPE_OPEN_PET_PACKAGE_REQUESTED, (event) => {
        if (!event) return;

        const roomObject = GetRoomEngine().getRoomObject(event.session.roomId, event.objectId, RoomObjectCategory.FLOOR);

        dispatch({ type: 'open', objectId: event.objectId, objectType: roomObject.type });
    });

    useOctaneEvent<RoomSessionPetPackageEvent>(RoomSessionPetPackageEvent.RSOPPE_OPEN_PET_PACKAGE_RESULT, (event) => {
        if (!event) return;

        if (event.nameValidationStatus === 0) {
            dispatch({ type: 'close' });
            return;
        }

        dispatch({ type: 'set-error', errorResult: getPetPackageNameError(event.nameValidationStatus) });
    });

    return {
        isVisible: state.isVisible,
        errorResult: state.errorResult,
        petName: state.petName,
        objectType: state.objectType,
        onChangePetName,
        onConfirm,
        onClose
    };
};

export const usePetPackageWidget = usePetPackageWidgetState;
