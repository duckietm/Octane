import { FC, useEffect, useState } from 'react';
import { localizeWithFallback } from '../../../../../api';
import { Button, Column, Flex, LayoutPetImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../../common';
import { PET_BREEDING_RESULT_NAME_INVALID, PetBreedingRequest } from '../../../../../hooks';

interface PetBreedingConfirmViewProps {
    request: PetBreedingRequest;
    failure: number;
    onConfirm: (name: string) => void;
    onCancel: () => void;
}

/** Longest name the official naming field accepts (`confirm_pet_breeding` input). */
const MAX_NAME_LENGTH = 15;

/**
 * Official `ConfirmPetBreedingView` (`confirm_pet_breeding` layout): the two parents, the name of
 * the offspring and the four rarity categories with the chance of each.
 */
export const PetBreedingConfirmView: FC<PetBreedingConfirmViewProps> = (props) => {
    const { request = null, failure = -1, onConfirm = null, onCancel = null } = props;
    const [name, setName] = useState('');

    useEffect(() => setName(''), [request?.nestId]);

    if (!request) return null;

    const pets = [request.pet1, request.pet2];

    return (
        <OctaneCardView className="octane-pet-breeding-confirm">
            <OctaneCardHeaderView headerText={localizeWithFallback('breedpets.confirmation.widget.title', 'Breeding Pets')} onCloseClick={onCancel} />
            <OctaneCardContentView gap={2}>
                <Text>
                    {localizeWithFallback('breedpets.confirmation.widget.text', 'Breeding these two pets will result a new baby pet for you to take care of.')}
                </Text>
                <Flex gap={2} justifyContent="between">
                    {pets.map((pet, index) => (
                        <Column key={index} alignItems="center" gap={1}>
                            <LayoutPetImageView figure={pet.figure} />
                            <Text bold>{pet.name}</Text>
                            <Text small>
                                {localizeWithFallback(`breedpets.widget.pet${index + 1}.level`, `Level ${pet.level} pet`, ['level'], [pet.level.toString()])}
                            </Text>
                            <Text small>{pet.owner}</Text>
                        </Column>
                    ))}
                </Flex>
                <Column gap={1}>
                    <Text bold>{localizeWithFallback('breedpets.confirmation.widget.breeding.info', 'BREEDING INFO')}</Text>
                    {request.rarityCategories.map((category, index) => (
                        <Text key={index} small>
                            {localizeWithFallback(
                                `breedpets.confirmation.widget.raritycategory.${index + 1}`,
                                `Rarity ${index + 1} (${category.chance}%)`,
                                ['percent'],
                                [category.chance.toString()]
                            )}
                        </Text>
                    ))}
                </Column>
                <Column gap={1}>
                    <Text>{localizeWithFallback('breedpets.confirmation.widget.baby.name', "BABY'S NAME")}</Text>
                    <input
                        data-testid="pet-breeding-name"
                        maxLength={MAX_NAME_LENGTH}
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                    />
                    {failure === PET_BREEDING_RESULT_NAME_INVALID && (
                        <Text small variant="danger">
                            {localizeWithFallback('breedpets.confirmation.alert.name.invalid.desc', 'Fix the name of the puppy and try again!')}
                        </Text>
                    )}
                </Column>
                <Flex justifyContent="between">
                    <Button variant="danger" onClick={onCancel}>
                        {localizeWithFallback('breedpets.confirmation.widget.button.cancel', 'No thanks, maybe later!')}
                    </Button>
                    <Button disabled={!name.trim().length} variant="success" onClick={() => onConfirm(name.trim())}>
                        {localizeWithFallback('breedpets.confirmation.widget.button.breed', "Let's Breed")}
                    </Button>
                </Flex>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
