import { FC } from 'react';
import { localizeWithFallback } from '../../../../../api';
import { Button, Column, Flex, LayoutFurniIconImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../../common';
import { PetBreedingOutcome } from '../../../../../hooks';

interface PetBreedingResultViewProps {
    outcome: PetBreedingOutcome;
    onClose: () => void;
}

/**
 * Official `BreedPetsResultView` (`breed_pets_result` layout): the two seeds two monsterplants
 * produced, their rarity levels and whether either of them mutated. An empty result (no stuff id)
 * is the "sorry" page of the official dialog.
 */
export const PetBreedingResultView: FC<PetBreedingResultViewProps> = (props) => {
    const { outcome = null, onClose = null } = props;

    if (!outcome) return null;

    const results = [outcome.resultData, outcome.otherResultData].filter((result) => result && result.stuffId > 0);
    const hasMutation = results.some((result) => result.hasMutation);

    return (
        <OctaneCardView className="octane-pet-breeding-result">
            <OctaneCardHeaderView headerText={localizeWithFallback('breedpetsresult.widget.title', 'Breeding result')} onCloseClick={onClose} />
            <OctaneCardContentView gap={2}>
                {!results.length && (
                    <Text>
                        {localizeWithFallback(
                            'breedpetsresult.widget.info.sorry',
                            'Do not worry, you can breed this plant again after you have treated it with the re-breeding potion!'
                        )}
                    </Text>
                )}
                {results.length > 0 && (
                    <>
                        <Text>{localizeWithFallback('breedpetsresult.widget.text', 'Oh joy! The plants generated these seeds.')}</Text>
                        {hasMutation && <Text bold>{localizeWithFallback('breedpetsresult.widget.info.mutation', 'You got a mutation!')}</Text>}
                        <Text small>{localizeWithFallback('breedpetsresult.widget.info', 'The seeds are in your inventory.')}</Text>
                        <Flex gap={2} justifyContent="between">
                            {results.map((result, index) => (
                                <Column key={result.stuffId} alignItems="center" gap={1}>
                                    <LayoutFurniIconImageView productClassId={result.classId} productType="s" />
                                    <Text small>
                                        {localizeWithFallback(
                                            `breedpetsresult.widget.seed${index + 1}.raritylevel`,
                                            `Rarity Level ${result.rarityLevel}`,
                                            ['level'],
                                            [result.rarityLevel.toString()]
                                        )}
                                    </Text>
                                    <Text small>
                                        {localizeWithFallback(
                                            `breedpetsresult.widget.seed${index + 1}.description`,
                                            `Owner: ${result.userName}`,
                                            ['name'],
                                            [result.userName]
                                        )}
                                    </Text>
                                </Column>
                            ))}
                        </Flex>
                    </>
                )}
                <Button variant="success" onClick={onClose}>
                    {localizeWithFallback('breedpetsresult.widget.close', 'Close')}
                </Button>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
