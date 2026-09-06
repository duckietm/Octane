import { FriendCategoryData } from '@octane/renderer';
import { FC, MouseEvent, useEffect, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Column, Flex, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useFriendsActions } from '../../../../hooks';

interface FriendsCategoryManagerViewProps {
    categories: FriendCategoryData[];
    onCloseClick: (event: MouseEvent) => void;
}

export const FriendsCategoryManagerView: FC<FriendsCategoryManagerViewProps> = (props) => {
    const { categories = [], onCloseClick = null } = props;
    const { addCategory, renameCategory, removeCategory } = useFriendsActions();
    const [newName, setNewName] = useState<string>('');
    const [editingId, setEditingId] = useState<number>(0);
    const [editingName, setEditingName] = useState<string>('');

    useEffect(() => {
        if (editingId && !categories.some((category) => category.id === editingId)) {
            setEditingId(0);
            setEditingName('');
        }
    }, [categories, editingId]);

    const submitAdd = () => {
        const trimmed = newName.trim();
        if (!trimmed.length) return;
        addCategory(trimmed);
        setNewName('');
    };

    const submitRename = () => {
        const trimmed = editingName.trim();
        if (editingId && trimmed.length) renameCategory(editingId, trimmed);
        setEditingId(0);
        setEditingName('');
    };

    return (
        <OctaneCardView
            className="octane-friends-category-manager min-w-0 max-w-[calc(100vw-16px)] max-h-[calc(100vh-16px)]"
            theme="primary-slim"
            uniqueKey="octane-friends-category-manager"
            isResizable={false}
        >
            <OctaneCardHeaderView headerText={LocalizeText('friendlist.friends')} onCloseClick={onCloseClick} />
            <OctaneCardContentView className="text-black" gap={1}>
                <Flex gap={1} alignItems="center">
                    <input
                        className="form-control form-control-sm w-full"
                        maxLength={25}
                        type="text"
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && submitAdd()}
                    />
                    <Button disabled={!newName.trim().length || categories.length >= 20} onClick={submitAdd}>
                        {LocalizeText('catalog.admin.create')}
                    </Button>
                </Flex>
                <Column gap={1}>
                    {categories.map((category) => (
                        <Flex key={category.id} alignItems="center" gap={1}>
                            {editingId === category.id ? (
                                <>
                                    <input
                                        autoFocus
                                        className="form-control form-control-sm w-full"
                                        maxLength={25}
                                        type="text"
                                        value={editingName}
                                        onChange={(event) => setEditingName(event.target.value)}
                                        onKeyDown={(event) => event.key === 'Enter' && submitRename()}
                                    />
                                    <Button onClick={submitRename}>{LocalizeText('catalog.admin.save')}</Button>
                                </>
                            ) : (
                                <>
                                    <span className="grow text-sm">{category.name}</span>
                                    <span
                                        className="cursor-pointer text-base leading-none select-none"
                                        title={LocalizeText('generic.edit')}
                                        onClick={() => {
                                            setEditingId(category.id);
                                            setEditingName(category.name);
                                        }}
                                    >
                                        {'✎'}
                                    </span>
                                    <span
                                        className="cursor-pointer text-base leading-none select-none"
                                        title={LocalizeText('generic.delete')}
                                        onClick={() => removeCategory(category.id)}
                                    >
                                        {'✕'}
                                    </span>
                                </>
                            )}
                        </Flex>
                    ))}
                    {!categories.length && <span className="text-muted text-center py-2 text-sm">{LocalizeText('friendlist.search.nofriendsfound')}</span>}
                </Column>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
