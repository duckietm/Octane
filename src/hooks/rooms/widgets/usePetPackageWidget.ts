import { GetRoomEngine, OpenPetPackageMessageComposer, RoomObjectCategory, RoomSessionPetPackageEvent } from '@octane/renderer';
import { useReducer, useRef } from 'react';
import { LocalizeText, SendMessageComposer } from '../../../api';
import { useOctaneEvent } from '../../events';
import { useNotification } from '../../notification';
import { getPetPackageNameError } from './usePetPackageWidget.helpers';

export interface PetPackageFigure {
    typeId: number;
    paletteId: number;
    color: number;
}

interface PetPackageState {
    isVisible: boolean;
    objectId: number;
    objectType: string;
    petName: string;
    /** The pet inside, when the package tells: AIR then shows the small window with its picture. */
    figure: PetPackageFigure | null;
}

type PetPackageAction =
    | { type: 'open'; objectId: number; objectType: string; figure: PetPackageFigure | null }
    | { type: 'close' }
    | { type: 'set-name'; petName: string };

const INITIAL_STATE: PetPackageState = {
    isVisible: false,
    objectId: -1,
    objectType: '',
    petName: '',
    figure: null
};

const petPackageReducer = (state: PetPackageState, action: PetPackageAction): PetPackageState => {
    switch (action.type) {
        case 'open':
            return { ...INITIAL_STATE, isVisible: true, objectId: action.objectId, objectType: action.objectType, figure: action.figure };
        case 'close':
            return INITIAL_STATE;
        case 'set-name':
            return { ...state, petName: action.petName };
    }
};

export { getPetPackageNameError };

const usePetPackageWidgetState = () => {
    const [state, dispatch] = useReducer(petPackageReducer, INITIAL_STATE);

    const { simpleAlert = null } = useNotification();
    // A result only counts while a name is on its way to the server, as in AIR.
    const pendingRef = useRef(false);

    const alertName = (message: string) => simpleAlert?.(message, null, null, null, LocalizeText('widgets.petpackage.alert.petname.title'));

    const onClose = () => {
        pendingRef.current = false;
        dispatch({ type: 'close' });
    };

    const onConfirm = () => {
        if (pendingRef.current || state.objectId === -1) return;

        if (!state.petName || !state.petName.length) {
            alertName(LocalizeText('catalog.alert.petname.short'));

            return;
        }

        pendingRef.current = true;
        SendMessageComposer(new OpenPetPackageMessageComposer(state.objectId, state.petName));
    };
    const onChangePetName = (petName: string) => dispatch({ type: 'set-name', petName });

    useOctaneEvent<RoomSessionPetPackageEvent>(RoomSessionPetPackageEvent.RSOPPE_OPEN_PET_PACKAGE_REQUESTED, (event) => {
        if (!event) return;

        const roomObject = GetRoomEngine().getRoomObject(event.session.roomId, event.objectId, RoomObjectCategory.FLOOR);

        pendingRef.current = false;
        const figureData = event.figureData;
        const figure = figureData && Number.isFinite(figureData.typeId) && figureData.typeId >= 0 ? { typeId: figureData.typeId, paletteId: figureData.paletteId, color: figureData.color } : null;

        dispatch({ type: 'open', objectId: event.objectId, objectType: roomObject.type, figure });
    });

    useOctaneEvent<RoomSessionPetPackageEvent>(RoomSessionPetPackageEvent.RSOPPE_OPEN_PET_PACKAGE_RESULT, (event) => {
        if (!event || !pendingRef.current) return;

        pendingRef.current = false;

        if (event.nameValidationStatus === 0) {
            dispatch({ type: 'close' });
            return;
        }

        // AIR shows the reason in the Notice alert, with the server's detail where the hotel has a text for it.
        alertName(getPetPackageNameError(event.nameValidationStatus, event.nameValidationInfo ?? ''));
    });

    return {
        isVisible: state.isVisible,
        petName: state.petName,
        objectType: state.objectType,
        figure: state.figure,
        onChangePetName,
        onConfirm,
        onClose
    };
};

export const usePetPackageWidget = usePetPackageWidgetState;
