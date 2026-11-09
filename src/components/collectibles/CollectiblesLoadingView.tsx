import { FC } from 'react';
import loadingIcon from '../../assets/images/collectibles/loading.png';
import { NativeTextTree } from '../../common/native-text/NativeTextTree';

/** The tabs' `loading_contents`: a turning loading icon in a framed box. */
export const CollectiblesLoadingView: FC = () => (
    <NativeTextTree>
        <div className="octane-collectibles-loading" role="status">
            <div className="octane-collectibles-loading-box">
                <img alt="" className="octane-collectibles-loading-icon" draggable={false} src={loadingIcon} />
            </div>
        </div>
    </NativeTextTree>
);
