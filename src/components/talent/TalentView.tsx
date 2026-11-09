import { FC } from 'react';
import { isTalentPromoVisible, localizeWithFallback } from '../../api';
import citizenshipIcon from '../../assets/images/talent/toolbar_citizenship_icon.png';
import { BaseButton } from '../../common/BaseButton';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';
import { useTalentTrack } from '../../hooks';
import { CitizenshipPopupView } from './CitizenshipPopupView';
import { TalentLevelUpView } from './TalentLevelUpView';
import { TalentTaskDialogView, TalentTourDialogView } from './TalentTaskDialogView';
import { TalentTrackView } from './TalentTrackView';

/** AIR HabboTalent: the talent track and everything that leads to it. */
export const TalentView: FC = () => {
    const {
        track,
        closeTrack,
        selectedTask,
        selectTask,
        isTourTask,
        runTaskAction,
        takeTour,
        levelUp,
        closeLevelUp,
        citizenshipPopup,
        closeCitizenshipPopup,
        promotedTrack,
        promoLevels,
        openTrack
    } = useTalentTrack();

    return (
        <NativeTextTree>
            <>
                {track && <TalentTrackView track={track} onClose={closeTrack} onOpenTrack={openTrack} onSelectTask={selectTask} />}
                {track && selectedTask && !isTourTask(selectedTask) && (
                    <TalentTaskDialogView task={selectedTask} trackName={track.name} onAction={runTaskAction} onClose={() => selectTask(null)} />
                )}
                {track && selectedTask && isTourTask(selectedTask) && <TalentTourDialogView onClose={() => selectTask(null)} onTakeTour={takeTour} />}
                {levelUp && <TalentLevelUpView levelUp={levelUp} onClose={closeLevelUp} onOpenTrack={openTrack} />}
                {citizenshipPopup && <CitizenshipPopupView onClose={closeCitizenshipPopup} onOpenTrack={openTrack} />}
                {promoLevels && isTalentPromoVisible(promotedTrack, promoLevels.level, promoLevels.maxLevel) && (
                    // TalentPromoCtrl (`track_promo`, 192x29): the toolbar strip that opens the promoted track.
                    <BaseButton className="octane-talent-promo" type="button" onClick={() => openTrack(promotedTrack)}>
                        <span>{localizeWithFallback(`talentpromo.${promotedTrack}.title`, promotedTrack.toUpperCase())}</span>
                        <img alt="" src={citizenshipIcon} />
                    </BaseButton>
                )}
            </>
        </NativeTextTree>
    );
};
