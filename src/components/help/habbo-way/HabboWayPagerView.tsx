import { FC, ImgHTMLAttributes } from 'react';
import nextIcon from '../../../assets/images/help/habboway/help_habboway_next.png';
import prevIcon from '../../../assets/images/help/habboway/help_habboway_prev.png';
import { BaseButton } from '../../../common/BaseButton';
import { NativeTextTree } from '../../../common/native-text/NativeTextTree';

/** The `progress_indicator` widget: one dot per page, the current one lit (0 lights none). */
export const HabboWayPageDotsView: FC<{ count: number; position: number }> = ({ count, position }) => (
    <div className="octane-habboway__dots" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
            <span key={index} className={index + 1 === position ? 'is-active' : ''} />
        ))}
    </div>
);

/** A picture of the image library: it hides itself when the hotel does not host it. */
export const LibraryImageView: FC<ImgHTMLAttributes<HTMLImageElement>> = (props) => (
    <NativeTextTree>
        <img
            alt=""
            draggable={false}
            {...props}
            onError={(event) => {
                event.currentTarget.style.visibility = 'hidden';
            }}
        />
    </NativeTextTree>
);

/** The `container_button`s of the Habbo Way layouts: arrow, separator and caption. */
export const HabboWayNavButtonView: FC<{ direction: 'prev' | 'next'; caption: string; onClick: () => void; disabled?: boolean }> = ({
    direction,
    caption,
    onClick,
    disabled = false
}) => (
    <BaseButton className={`octane-habboway__nav is-${direction}`} disabled={disabled} type="button" onClick={onClick}>
        {direction === 'prev' && <img alt="" src={prevIcon} />}
        {direction === 'prev' && <span className="octane-habboway__nav-sep" />}
        <span className="octane-habboway__nav-caption">{caption}</span>
        {direction === 'next' && <span className="octane-habboway__nav-sep" />}
        {direction === 'next' && <img alt="" src={nextIcon} />}
    </BaseButton>
);
