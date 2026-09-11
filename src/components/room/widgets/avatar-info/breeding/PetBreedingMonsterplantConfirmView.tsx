import { BreedPetsMessageComposer } from '@octane/renderer';
import { FC } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../../../api';
import { Button, Flex, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../../common';
import { PetBreedingConfirmation } from '../../../../../hooks';

interface PetBreedingMonsterplantConfirmViewProps {
    confirmation: PetBreedingConfirmation;
    onClose: () => void;
}

/**
 * Official `BreedMonsterPlantsConfirmationView` (`breed_pets_confirmation` layout): the dialog the
 * `PetBreedingMessage` state opens between two monsterplant owners. Accepting sends the official
 * `BreedPets` composer with the two plants.
 */
export const PetBreedingMonsterplantConfirmView: FC<PetBreedingMonsterplantConfirmViewProps> = (props) => {
    const { confirmation = null, onClose = null } = props;

    if (!confirmation) return null;

    const accept = () => {
        SendMessageComposer(
            new BreedPetsMessageComposer(
                confirmation.isRequester ? BreedPetsMessageComposer.STATE_START : BreedPetsMessageComposer.STATE_ACCEPT,
                confirmation.ownPetId,
                confirmation.otherPetId
            )
        );

        onClose();
    };

    const cancel = () => {
        SendMessageComposer(new BreedPetsMessageComposer(BreedPetsMessageComposer.STATE_CANCEL, confirmation.ownPetId, confirmation.otherPetId));

        onClose();
    };

    return (
        <OctaneCardView className="octane-pet-breeding-monsterplant-confirm">
            <OctaneCardHeaderView headerText={localizeWithFallback('breedpets.widget.title', 'Breeding plants')} onCloseClick={cancel} />
            <OctaneCardContentView gap={2}>
                <Text>{localizeWithFallback('breedpets.widget.text', 'Do you want to breed these plants and generate new seeds?')}</Text>
                <Text small>{localizeWithFallback('breedpets.widget.info', 'Plants can be bred only once!')}</Text>
                <Flex justifyContent="between">
                    <Button variant="danger" onClick={cancel}>
                        {localizeWithFallback('breedpets.widget.cancel', 'Cancel')}
                    </Button>
                    <Button variant="success" onClick={accept}>
                        {confirmation.isRequester
                            ? localizeWithFallback('breedpets.widget.request', 'Ask to breed plants')
                            : localizeWithFallback('breedpets.widget.accept', 'Accept')}
                    </Button>
                </Flex>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
