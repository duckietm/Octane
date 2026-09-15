import { FC } from 'react';
import { localizeWithFallback } from '../../../../../api';
import { Button, Column, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../../common';
import { PetBreedingNestSuccess } from '../../../../../hooks';

interface PetBreedingNestSuccessViewProps {
    success: PetBreedingNestSuccess;
    onClose: () => void;
}

/**
 * Official `NestBreedingSuccessView` (`nestBreedingSuccessDialog` layout): the offspring the nest
 * produced and the rarity category its breed fell into
 * (`${breedpets.nestbreeding.success.raritycategory.<n>}`).
 */
export const PetBreedingNestSuccessView: FC<PetBreedingNestSuccessViewProps> = (props) => {
    const { success = null, onClose = null } = props;

    if (!success) return null;

    return (
        <OctaneCardView className="octane-pet-breeding-success">
            <OctaneCardHeaderView headerText={localizeWithFallback('breedpets.nestbreeding.success.header', 'Breeding over')} onCloseClick={onClose} />
            <OctaneCardContentView gap={2}>
                <Column gap={1}>
                    <Text>{localizeWithFallback('breedpets.nestbreeding.success.title', 'You are now a proud owner of...')}</Text>
                    <Text bold data-testid="pet-breeding-success-rarity">
                        {localizeWithFallback(
                            `breedpets.nestbreeding.success.raritycategory.${success.rarityCategory}`,
                            `Rarity class: ${success.rarityCategory}`
                        )}
                    </Text>
                </Column>
                <Button variant="success" onClick={onClose}>
                    {localizeWithFallback('breedpets.nestbreeding.success.button.ok', 'I will take good care of it!')}
                </Button>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
