import { FC } from 'react';
import quicklinkAdd from '../../assets/images/navigator/air/quicklink-add.png';
import { BaseButton } from '../BaseButton';

export interface LayoutSearchSavesViewProps {
    title: string;
    onClick?: () => void;
}

export const LayoutSearchSavesView: FC<LayoutSearchSavesViewProps> = (props) => {
    const { title = null, onClick = null } = props;

    return (
        <BaseButton type="button" className="octane-navigator-search-save" title={title} onClick={onClick}>
            <img src={quicklinkAdd} alt="" />
        </BaseButton>
    );
};
