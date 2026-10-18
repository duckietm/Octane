import { AvatarInfoFurni, LocalizeText } from '../../../../../api';

type FurniKind = Pick<AvatarInfoFurni, 'isBuildersClub' | 'isTemporary'>;

/** Official InfoStandFurniView.update: the panel colour follows the furni's id band. */
export const infostandFurniPanelClass = (info: FurniKind): string => {
    if (info.isBuildersClub) return 'octane-infostand-furni--builders-club bg-[rgba(51,28,0,.95)]';
    if (info.isTemporary) return 'octane-infostand-furni--temporary bg-[rgba(20,43,68,.95)]';

    return 'bg-[rgba(28,28,32,.95)]';
};

/** Official setOwnerInfo: a Builders Club furni names the warehouse, a temporary copy the Wired catalogue. */
export const infostandFurniOwnerText = (info: FurniKind & Pick<AvatarInfoFurni, 'ownerName'>): string => {
    if (info.isBuildersClub) return LocalizeText('builder.catalog.title');
    if (info.isTemporary) return LocalizeText('temp.catalog.title');

    return LocalizeText('furni.owner', ['name'], [info.ownerName]);
};
