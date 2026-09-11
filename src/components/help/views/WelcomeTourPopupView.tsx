import { FC } from 'react';
import { localizeWithFallback } from '../../../api';
import { OctaneCardContentView, OctaneCardHeaderView, OctaneCardView, Text } from '../../../common';
import { useWelcomeTour } from '../../../hooks';

/**
 * The official new-user tour offer (welcome_tour_popup layout, 435x222):
 * title, description, the "Take me on a tour!" button, the refuse link and
 * the hint box. Its frame caption is the accept text, as in the official
 * layout.
 */
export const WelcomeTourPopupView: FC<{}> = () => {
    const { tourPopupVisible = false, closeTourPopup = null, acceptTour = null } = useWelcomeTour();

    if (!tourPopupVisible) return null;

    return (
        <OctaneCardView className="octane-help octane-welcome-tour min-w-0 w-[min(435px,calc(100vw-16px))] max-w-[calc(100vw-16px)]" theme="primary-slim">
            <OctaneCardHeaderView headerText={localizeWithFallback('help.tour.popup.action.accept', 'Take me on a tour!')} onCloseClick={closeTourPopup} />
            <OctaneCardContentView className="text-black">
                <div className="flex flex-col gap-2">
                    <Text bold>{localizeWithFallback('help.tour.popup.title', "Now that you've arrived, it's time to take a look around!")}</Text>
                    <Text small>
                        {localizeWithFallback(
                            'help.tour.popup.description',
                            "So how about taking a personal tour from one of your more experienced fellow habbos? There's plenty for you to see around here. :)"
                        )}
                    </Text>
                    <div className="flex flex-col items-center gap-1 py-1">
                        <button type="button" className="habbo-btn-green habbo-btn-green--auto min-w-[226px]" onClick={acceptTour}>
                            {localizeWithFallback('help.tour.popup.action.accept', 'Take me on a tour!')}
                        </button>
                        <button type="button" className="help-link" onClick={closeTourPopup}>
                            {localizeWithFallback('help.tour.popup.action.refuse', "No thanks, I'd rather explore on my own.")}
                        </button>
                    </div>
                    <div className="rounded border border-[#c8c8c8] bg-[#f1f1f1] p-1.5">
                        <Text small>
                            {localizeWithFallback(
                                'help.tour.popup.hint',
                                'Hint: You can also call a tour guide at any time using the "Help" link in the top left part of the screen.'
                            )}
                        </Text>
                    </div>
                </div>
            </OctaneCardContentView>
        </OctaneCardView>
    );
};
