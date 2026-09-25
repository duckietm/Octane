import { FC } from 'react';
import { LocalizeText } from '../../../../../api';

interface InfoStandHeaderViewProps {
    name: string;
    onClose: () => void;
}

/**
 * The name line and close button of the pet and bot infostands, drawn like the
 * user infostand's: the name in the Volter identity style and the skin's close
 * button in the corner.
 */
export const InfoStandHeaderView: FC<InfoStandHeaderViewProps> = ({ name, onClose }) => (
    <>
        <button
            type="button"
            className="octane-infostand__close"
            aria-label={LocalizeText('generic.close')}
            title={LocalizeText('generic.close')}
            onClick={onClose}
        />
        <div className="octane-infostand__header">
            <span className="octane-infostand__identity">{name}</span>
        </div>
    </>
);
