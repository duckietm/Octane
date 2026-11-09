import { FC } from 'react';
import { isOfficialCustomContractParams } from '../../../../api/wired/WiredCustomContract';
import { useWired } from '../../../../hooks';
import { WiredCustomContractFreeFormView } from './WiredCustomContractFreeFormView';
import { WiredCustomContractOfficialView } from './WiredCustomContractOfficialView';

/**
 * The custom contract editor: AIR's official form, or our older free-form editor for a contract saved by it that the
 * official form cannot say (the server sends that one's rules, `[-1, ...]`, instead of the official ints).
 */
export const WiredCustomContractView: FC<{}> = () => {
    const { trigger = null } = useWired();

    return isOfficialCustomContractParams(trigger?.intData ?? []) ? <WiredCustomContractOfficialView /> : <WiredCustomContractFreeFormView />;
};
