import { localizeWithFallback } from '../../utils/localizeWithFallback';

type ShowConfirm = (message: string, onConfirm: () => void, onCancel: () => void, confirmText?: string, cancelText?: string, title?: string) => void;

/**
 * AIR AvatarInfoWidgetHandler RWUAM_COMPOST_PLANT: composting destroys the plant, so it asks first
 * (monsterplant.confirm.title.compost / monsterplant.confirm.desc.compost) and composts on OK only.
 */
export const confirmCompostPlant = (showConfirm: ShowConfirm, compost: () => void): void => {
    showConfirm(
        localizeWithFallback('monsterplant.confirm.desc.compost', "Are you sure you want to compost your dead Monster Plant? This action can't be undone."),
        compost,
        null,
        null,
        null,
        localizeWithFallback('monsterplant.confirm.title.compost', 'Compost your plant')
    );
};
