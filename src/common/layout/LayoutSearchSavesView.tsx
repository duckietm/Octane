import { FC } from 'react';
import quicklinkAdd from '../../assets/images/navigator/air/quicklink-add.png';
import { BaseButton } from '../BaseButton';
import { Hint } from '../Tooltip';

export interface LayoutSearchSavesViewProps {
    title: string;
    onClick?: () => void;
}

export const LayoutSearchSavesView: FC<LayoutSearchSavesViewProps> = (props) => {
    const { title = null, onClick = null } = props;

    return (
        <Hint content={title}>
            <BaseButton aria-label={title} type="button" className="octane-navigator-search-save" onClick={onClick}>
                <img src={quicklinkAdd} alt="" />
            </BaseButton>
        </Hint>
    );
};
