import { FC, useEffect } from 'react';
import { localizeWithFallback } from '../../../../../api';
import {
    PET_BREEDING_RESULT_NAME_INVALID,
    PET_BREEDING_RESULT_NO_NEST,
    PET_BREEDING_RESULT_PETS_MISSING,
    useNotification,
    usePetBreedingWidget
} from '../../../../../hooks';
import { PetBreedingConfirmView } from './PetBreedingConfirmView';
import { PetBreedingMonsterplantConfirmView } from './PetBreedingMonsterplantConfirmView';
import { PetBreedingNestSuccessView } from './PetBreedingNestSuccessView';
import { PetBreedingResultView } from './PetBreedingResultView';

/**
 * The four dialogs the official `AvatarInfoWidget` opens for pet breeding, and the alerts it shows
 * for the `ConfirmBreedingResult` codes it cannot draw a dialog for.
 */
export const PetBreedingWidgetView: FC<{}> = (props) => {
    const {
        request = null,
        requestFailure = -1,
        nestSuccess = null,
        outcome = null,
        confirmation = null,
        confirmBreeding = null,
        cancelBreeding = null,
        dismissRequestFailure = null,
        dismissNestSuccess = null,
        dismissOutcome = null,
        dismissConfirmation = null
    } = usePetBreedingWidget();
    const { simpleAlert = null } = useNotification();

    useEffect(() => {
        if (requestFailure !== PET_BREEDING_RESULT_NO_NEST && requestFailure !== PET_BREEDING_RESULT_PETS_MISSING) return;

        const suffix = requestFailure === PET_BREEDING_RESULT_NO_NEST ? 'nonest' : 'petsmissing';

        simpleAlert(
            localizeWithFallback(
                `breedpets.confirmation.alert.${suffix}.desc`,
                requestFailure === PET_BREEDING_RESULT_NO_NEST ? 'Could not find the breeding nest' : 'Oh no, the parent pets ran off the nest!'
            ),
            null,
            null,
            null,
            localizeWithFallback('breedpets.confirmation.alert.title', 'Error!')
        );

        dismissRequestFailure();
    }, [requestFailure, simpleAlert, dismissRequestFailure]);

    return (
        <>
            {request && (
                <PetBreedingConfirmView
                    failure={requestFailure === PET_BREEDING_RESULT_NAME_INVALID ? requestFailure : -1}
                    request={request}
                    onCancel={cancelBreeding}
                    onConfirm={confirmBreeding}
                />
            )}
            {confirmation && <PetBreedingMonsterplantConfirmView confirmation={confirmation} onClose={dismissConfirmation} />}
            {nestSuccess && <PetBreedingNestSuccessView success={nestSuccess} onClose={dismissNestSuccess} />}
            {outcome && <PetBreedingResultView outcome={outcome} onClose={dismissOutcome} />}
        </>
    );
};
