import { FC, useEffect, useState } from 'react';
import { GetConfigurationValue, localizeWithFallback } from '../../../api';
import {
    CURSED_DRAGON_DEFAULT_PET_TYPE,
    CursedDragonChoice,
    CursedDragonChoiceValue,
    CursedDragonClaimState,
    cursedDragonPosture
} from '../../../api/catalog/CursedDragonAdoption';
import { LayoutPetImageView, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';
import { useNotification } from '../../../hooks';
import { useCursedDragonAdoption } from '../../../hooks/catalog/useCursedDragonAdoption';

const POSTURE_TICK_MS = 1000;

const CHOICES: { choice: CursedDragonChoiceValue; side: 'blue' | 'purple'; direction: number; fallbackTitle: string; fallbackName: string }[] = [
    { choice: CursedDragonChoice.BLUE, side: 'blue', direction: 2, fallbackTitle: 'Blue Cursed Dragon', fallbackName: 'blue' },
    { choice: CursedDragonChoice.PURPLE, side: 'purple', direction: 4, fallbackTitle: 'Purple Cursed Dragon', fallbackName: 'purple' }
];

/**
 * AIR CursedDragonAdoptionView + CursedDragonPreviewView (layout cursed_dragon_adoption, 788 x 593 under the title
 * bar): the introduction over the cave, a dragon on each crate, and an adopt button per dragon behind a confirmation.
 */
export const CursedDragonAdoptionView: FC<{}> = () => {
    const { isVisible = false, claimState = CursedDragonClaimState.UNKNOWN, canClaim = false, close = null, makeClaim = null } = useCursedDragonAdoption();
    const { showConfirm = null } = useNotification();
    const [elapsed, setElapsed] = useState(0);

    // AIR CursedDragonPreviewView.update: the dragons breathe fire and eat on a 24 second loop while the window shows.
    useEffect(() => {
        if (!isVisible) return;

        setElapsed(0);

        const started = Date.now();
        const interval = setInterval(() => setElapsed(Date.now() - started), POSTURE_TICK_MS);

        return () => clearInterval(interval);
    }, [isVisible]);

    if (!isVisible) return null;

    // The pet drawn on the crates; a hotel whose cursed dragon has another pet type id sets it here.
    const configuredPetType = Number(GetConfigurationValue<number>('cursed_dragon_adoption.pet_type', CURSED_DRAGON_DEFAULT_PET_TYPE));
    const petType = Number.isInteger(configuredPetType) && configuredPetType >= 0 ? configuredPetType : CURSED_DRAGON_DEFAULT_PET_TYPE;
    const adoptLabel =
        claimState === CursedDragonClaimState.CLAIMED
            ? localizeWithFallback('cursed_dragon_adoption.adopted', 'Adopted')
            : localizeWithFallback('cursed_dragon_adoption.adopt', 'Adopt');
    const buttonsDisabled = !canClaim;

    // AIR confirmAdoption: the confirmation names the colour and the claim is sent on OK only. A second confirmation
    // left open does no harm: only the first claim is sent, the state has left AVAILABLE by then.
    const confirmAdoption = (choice: CursedDragonChoiceValue, fallbackName: string) => {
        if (buttonsDisabled) return;

        const colour = localizeWithFallback(`cursed_dragon_adoption.${choice === CursedDragonChoice.BLUE ? 'blue' : 'purple'}.name`, fallbackName);

        showConfirm(
            localizeWithFallback('cursed_dragon_adoption.confirm.desc', 'Adopt the %colour% dragon? You can adopt only one, and the choice cannot be changed.', ['colour'], [colour]),
            () => makeClaim(choice),
            null,
            null,
            null,
            localizeWithFallback('cursed_dragon_adoption.confirm.title', 'Adopt this dragon?')
        );
    };

    return (
        <NativeTextTree>
            <OctaneCardView className="octane-cursed-dragon" isResizable={false} uniqueKey="cursed-dragon-adoption">
                <OctaneCardHeaderView headerText={localizeWithFallback('cursed_dragon_adoption.title', 'Cursed Dragon Adoption')} onCloseClick={close} />
                <OctaneCardContentView className="octane-cursed-dragon__content" overflow="hidden">
                    <div className="octane-cursed-dragon__scene">
                        <div className="octane-cursed-dragon__intro">
                            <div className="octane-cursed-dragon__eyebrow">{localizeWithFallback('cursed_dragon_adoption.eyebrow', 'A CURSE FROM THE CAVES')}</div>
                            <div className="octane-cursed-dragon__intro-title">{localizeWithFallback('cursed_dragon_adoption.intro.title', 'Two dragons need a home')}</div>
                            <div className="octane-cursed-dragon__intro-body">
                                {localizeWithFallback(
                                    'cursed_dragon_adoption.intro.body',
                                    'Deep in the cursed caves two dragon crates were found. Each holds a young dragon looking for an owner. You can adopt one of them, for free, but only one: choose carefully.'
                                )}
                            </div>
                            <div className="octane-cursed-dragon__frank" />
                        </div>
                        <div className="octane-cursed-dragon__hint">{localizeWithFallback('cursed_dragon_adoption.choose', 'Choose the dragon you want to adopt')}</div>
                        {CHOICES.map(({ choice, side, direction, fallbackTitle, fallbackName }) => (
                            <div key={side} className={`octane-cursed-dragon__side octane-cursed-dragon__side--${side}`}>
                                <div className="octane-cursed-dragon__package" />
                                <div className="octane-cursed-dragon__pet">
                                    <LayoutPetImageView direction={direction} paletteId={choice} posture={cursedDragonPosture(choice, elapsed)} scale={2} typeId={petType} />
                                </div>
                                <div className="octane-cursed-dragon__choice">
                                    <div className="octane-cursed-dragon__name">{localizeWithFallback(`cursed_dragon_adoption.${side}`, fallbackTitle)}</div>
                                    <BaseButton className="octane-cursed-dragon__adopt" disabled={buttonsDisabled} onClick={() => confirmAdoption(choice, fallbackName)}>
                                        {adoptLabel}
                                    </BaseButton>
                                </div>
                            </div>
                        ))}
                    </div>
                </OctaneCardContentView>
            </OctaneCardView>
        </NativeTextTree>
    );
};
