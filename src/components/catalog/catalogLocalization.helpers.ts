import { IPageLocalization } from '../../api';

const DEFAULT_TEXT_FIELDS = ['catalog.header.description', 'ctlg_description', 'ctlg_special_txt', 'ctlg_text_1', 'ctlg_text_2'];

const LAYOUT_TEXT_FIELDS: Record<string, string[]> = {
    camera1: ['catalog.header.description', 'ctlg_text_1'],
    presents: ['catalog.header.description', 'ctlg_text1'],
    pets: ['catalog.header.description', 'ctlg_text_1', 'ctlg_text_2', 'ctlg_text_3'],
    pets2: ['catalog.header.description', 'ctlg_text_1', 'ctlg_text_2', 'ctlg_text_3'],
    pets3: ['catalog.header.description', 'ctlg_text_1', 'ctlg_text_2', 'ctlg_text_3'],
    info_rentables: ['catalog.header.description', 'ctlg_text_1', 'ctlg_text_2', 'ctlg_text_3', 'ctlg_text_4', 'ctlg_text_5'],
    info_duckets: ['ctlg_description'],
    info_loyalty: ['ctlg_description'],
    trophies: ['trophy.description', 'trophy.enscription'],
    frontpage4: ['ctlg_txt1', 'ctlg_txt2'],
    frontpage_featured: ['ctlg_txt1', 'ctlg_txt2'],
    builders_club_frontpage: ['ctlg_description'],
    builders_club_addons: ['ctlg_description'],
    builders_club_loyalty: ['ctlg_description']
};

export const getCatalogTextElementName = (index: number, layoutCode: string): string => {
    const fields = LAYOUT_TEXT_FIELDS[layoutCode] ?? DEFAULT_TEXT_FIELDS;

    return fields[index] ?? '';
};

export const getCatalogHeaderDescription = (layoutCode: string, localization: IPageLocalization | null | undefined): string => {
    if (!localization || getCatalogTextElementName(0, layoutCode) !== 'catalog.header.description') return '';

    return localization.getText(0) || '';
};
