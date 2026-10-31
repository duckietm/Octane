import { FC } from 'react';
import { getCatalogNodeKey, ICatalogNode } from '../../../../api';
import { NativeTextTree } from '../../../../common/native-text/NativeTextTree';
import { CatalogNavigationItemView } from './CatalogNavigationItemView';
import { CatalogNavigationRuntime } from './CatalogNavigationRuntime';

export interface CatalogNavigationSetViewProps {
    node: ICatalogNode;
    runtime: CatalogNavigationRuntime;
    child?: boolean;
}

export const CatalogNavigationSetView: FC<CatalogNavigationSetViewProps> = (props) => {
    const { node = null, runtime, child = false } = props;

    return (
        <NativeTextTree>
            <>
                {node &&
                    node.children.length > 0 &&
                    node.children.map((n, index) => {
                        if (!n.isVisible) return null;

                        return <CatalogNavigationItemView key={getCatalogNodeKey(n, index)} child={child} node={n} runtime={runtime} />;
                    })}
            </>
        </NativeTextTree>
    );
};
