import { FC } from 'react';
import quicklinkAdd from '../../assets/images/navigator/air/quicklink-add.png';

export interface LayoutSearchSavesViewProps {
    title: string;
    onClick?: () => void;
}

export const LayoutSearchSavesView: FC<LayoutSearchSavesViewProps> = (props) => {
    const { title = null, onClick = null } = props;

    return (
        <button type="button" className="octane-navigator-search-save" title={title} onClick={onClick}>
            <img src={quicklinkAdd} alt="" />
        </button>
    );
};
