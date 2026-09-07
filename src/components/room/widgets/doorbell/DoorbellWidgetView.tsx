import { FC, useState } from 'react';
import { LocalizeText } from '../../../../api';
import { Button, Column, Grid, OctaneCardContentView, OctaneCardHeaderView, OctaneCardView } from '../../../../common';
import { useDoorbellActions, useDoorbellState } from '../../../../hooks';

export const DoorbellWidgetView: FC = () => {
    const users = useDoorbellState();
    const { answer } = useDoorbellActions();
    const [dismissed, setDismissed] = useState(false);

    const isVisible = !dismissed && users.length > 0;

    if (!isVisible) return null;

    return (
        <OctaneCardView className="octane-widget-doorbell" theme="primary-slim">
            <OctaneCardHeaderView headerText={LocalizeText('navigator.doorbell.title')} onCloseClick={() => setDismissed(true)} />
            <OctaneCardContentView gap={0} overflow="hidden">
                <Column gap={2}>
                    <Grid className="text-black font-bold	 border-bottom px-1 pb-1" gap={1}>
                        <div className="col-span-6">{LocalizeText('generic.username')}</div>
                        <div className="col-span-6" />
                    </Grid>
                </Column>
                <Column className="striped-children" gap={0} overflow="auto">
                    {users.map((userName) => (
                        <Grid key={userName} alignItems="center" className="text-black border-bottom p-1" gap={1}>
                            <div className="col-span-6">{userName}</div>
                            <div className="col-span-6">
                                <div className="flex items-center gap-1 justify-end">
                                    <Button variant="success" onClick={() => answer(userName, true)}>
                                        {LocalizeText('generic.accept')}
                                    </Button>
                                    <Button variant="danger" onClick={() => answer(userName, false)}>
                                        {LocalizeText('generic.deny')}
                                    </Button>
                                </div>
                            </div>
                        </Grid>
                    ))}
                </Column>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
