import {
    BreedingPetInfo,
    CancelPetBreedingComposer,
    ConfirmPetBreedingComposer,
    RarityCategoryData,
    RoomSessionConfirmPetBreedingEvent,
    RoomSessionConfirmPetBreedingResultEvent,
    RoomSessionNestBreedingSuccessEvent
} from '@octane/renderer';
import { FC, useState } from 'react';
import { localizeWithFallback, SendMessageComposer } from '../../../../api';
import { Button, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../../common';
import { useOctaneEvent, useRoom } from '../../../../hooks';

interface BreedingRequest {
    nestId: number;
    pet1: BreedingPetInfo;
    pet2: BreedingPetInfo;
    rarities: RarityCategoryData[];
}

// The server checks the same limit (1-15 characters).
const MAX_NAME_LENGTH = 15;

const RESULT_OK = 0;
const RESULT_NO_NEST = 1;
const RESULT_PETS_MISSING = 2;
const RESULT_NAME_INVALID = 3;

const PetSummary: FC<{ pet: BreedingPetInfo }> = ({ pet }) => (
    <div className="flex flex-col items-center grow rounded bg-black/10 p-2 min-w-0">
        <Text bold truncate>{pet.name}</Text>
        <Text small>{localizeWithFallback('breedpets.widget.pet1.level', `Level ${pet.level}`, ['level'], [pet.level.toString()])}</Text>
        <Text small truncate variant="muted">{pet.owner}</Text>
    </div>
);

/** Habbo's breeding confirmation (name the baby) and the "proud owner" result. */
export const PetBreedingView: FC = () => {
    const [request, setRequest] = useState<BreedingRequest>(null);
    const [babyName, setBabyName] = useState('');
    const [error, setError] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [success, setSuccess] = useState<{ petName: string; rarity: number }>(null);
    const { roomSession = null } = useRoom();

    useOctaneEvent<RoomSessionConfirmPetBreedingEvent>(RoomSessionConfirmPetBreedingEvent.CONFIRM_PET_BREEDING, (event) => {
        setRequest({ nestId: event.nestId, pet1: event.pet1, pet2: event.pet2, rarities: event.rarityCategories ?? [] });
        setBabyName('');
        setError('');
        setIsSending(false);
    });

    useOctaneEvent<RoomSessionConfirmPetBreedingResultEvent>(RoomSessionConfirmPetBreedingResultEvent.RSPFUE_CONFIRM_PET_BREEDING_RESULT, (event) => {
        setIsSending(false);

        switch (event.result) {
            case RESULT_OK:
                setRequest(null);
                return;
            case RESULT_NAME_INVALID:
                setError(localizeWithFallback('breedpets.confirmation.alert.name.invalid.desc', 'Fix the name of the baby and try again!'));
                return;
            case RESULT_NO_NEST:
                setRequest(null);
                setError(localizeWithFallback('breedpets.confirmation.alert.nonest.desc', 'Could not find the breeding nest'));
                return;
            case RESULT_PETS_MISSING:
                setRequest(null);
                setError(localizeWithFallback('breedpets.confirmation.alert.petsmissing.desc', 'Oh no, the parent pets ran off the nest!'));
                return;
        }
    });

    useOctaneEvent<RoomSessionNestBreedingSuccessEvent>(RoomSessionNestBreedingSuccessEvent.NEST_BREEDING_SUCCESS, (event) => {
        const petName = roomSession?.userDataManager?.getPetData(event.petId)?.name ?? '';

        setRequest(null);
        setSuccess({ petName, rarity: event.rarityCategory });
    });

    if (success) {
        return (
            <OctaneCardView className="octane-pet-breeding" theme="primary-slim">
                <OctaneCardHeaderView headerText={localizeWithFallback('breedpets.nestbreeding.success.header', 'Breeding over')} onCloseClick={() => setSuccess(null)} />
                <OctaneCardContentView center gap={2}>
                    <Text>{localizeWithFallback('breedpets.nestbreeding.success.title', 'You are now a proud owner of...')}</Text>
                    {success.petName && <Text bold>{success.petName}</Text>}
                    <Text small>{localizeWithFallback(`breedpets.nestbreeding.success.raritycategory.${success.rarity}`, '')}</Text>
                    <Button variant="success" onClick={() => setSuccess(null)}>
                        {localizeWithFallback('breedpets.nestbreeding.success.button.ok', 'I\'m going to take good care of it!')}
                    </Button>
                </OctaneCardContentView>
            </OctaneCardView>
        );
    }

    if (!request) {
        if (!error) return null;

        return (
            <OctaneCardView className="octane-pet-breeding" theme="primary-slim">
                <OctaneCardHeaderView headerText={localizeWithFallback('breedpets.confirmation.alert.title', 'Error!')} onCloseClick={() => setError('')} />
                <OctaneCardContentView center gap={2}>
                    <Text center>{error}</Text>
                    <Button onClick={() => setError('')}>{localizeWithFallback('generic.ok', 'OK')}</Button>
                </OctaneCardContentView>
            </OctaneCardView>
        );
    }

    const cancel = () => {
        SendMessageComposer(new CancelPetBreedingComposer(request.nestId));
        setRequest(null);
        setError('');
    };

    const breed = () => {
        const name = babyName.trim();

        if (!name.length) {
            setError(localizeWithFallback('breedpets.confirmation.alert.name.required.desc', 'Your baby pet needs a name!'));

            return;
        }

        if (isSending) return;

        setError('');
        setIsSending(true);
        SendMessageComposer(new ConfirmPetBreedingComposer(request.nestId, name, request.pet1.webId, request.pet2.webId));
    };

    return (
        <OctaneCardView className="octane-pet-breeding" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('breedpets.confirmation.widget.title', 'Breeding Pets')} onCloseClick={cancel} />
            <OctaneCardContentView gap={2} overflow="auto">
                <Text small>{localizeWithFallback('breedpets.confirmation.widget.request', 'Do you want to breed these pets?')}</Text>
                <div className="flex gap-2">
                    <PetSummary pet={request.pet1} />
                    <PetSummary pet={request.pet2} />
                </div>
                {request.rarities.length > 0 && (
                    <div className="flex flex-col gap-0.5">
                        <Text small bold>{localizeWithFallback('breedpets.confirmation.widget.breeding.info', 'BREEDING INFO')}</Text>
                        {request.rarities.map((rarity, index) => (
                            <Text key={index} small>
                                {localizeWithFallback(`breedpets.confirmation.widget.raritycategory.${index + 1}`, `${rarity.chance}%`, ['percent'], [rarity.chance.toString()])}
                            </Text>
                        ))}
                    </div>
                )}
                <label className="flex flex-col gap-1">
                    <Text small bold>{localizeWithFallback('breedpets.confirmation.widget.baby.name', 'BABY\'S NAME')}</Text>
                    <input
                        className="form-control form-control-sm"
                        maxLength={MAX_NAME_LENGTH}
                        type="text"
                        value={babyName}
                        onChange={(event) => setBabyName(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && breed()}
                    />
                </label>
                {error && <Text small className="text-[#a81a12]">{error}</Text>}
                <div className="flex justify-between gap-1 mt-auto">
                    <Button variant="secondary" onClick={cancel}>
                        {localizeWithFallback('breedpets.confirmation.widget.button.cancel', 'No thanks, maybe later!')}
                    </Button>
                    <Button variant="success" disabled={isSending} onClick={breed}>
                        {localizeWithFallback('breedpets.confirmation.widget.button.breed', 'Let\'s Breed')}
                    </Button>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
