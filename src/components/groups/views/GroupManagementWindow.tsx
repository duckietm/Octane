import { FC, ReactNode, useState } from 'react';
import { LocalizeText } from '../../../api';
import gcreate10 from '../../../assets/images/groups/native/gcreate_1_0.png';
import gcreate11 from '../../../assets/images/groups/native/gcreate_1_1.png';
import gcreate20 from '../../../assets/images/groups/native/gcreate_2_0.png';
import gcreate21 from '../../../assets/images/groups/native/gcreate_2_1.png';
import gcreate40 from '../../../assets/images/groups/native/gcreate_4_0.png';
import gcreate41 from '../../../assets/images/groups/native/gcreate_4_1.png';
import creditIcon from '../../../assets/images/groups/native/gcreate_icon_credit.png';
import headerBadge from '../../../assets/images/groups/native/group_UI_badge.png';
import headerColors from '../../../assets/images/groups/native/group_UI_colors.png';
import headerIdentity from '../../../assets/images/groups/native/group_UI_identity.png';
import headerReady from '../../../assets/images/groups/native/group_UI_ready.png';
import { OctaneCardHeaderView, OctaneCardView } from '../../../common';
import { GroupAlert, GroupAlertContext, GroupNativeAlertView } from './GroupNativeAlertView';
import { flatText, GROUP_HEADER_SURFACE, GroupText, GroupWindowTitle } from './GroupNativeLayout';

// header_pic_bitmap_step_N, stretched into their 114x62 layout rectangle.
const HEADER_IMAGES: Record<number, string> = { 1: headerIdentity, 2: headerBadge, 3: headerColors, 4: headerReady, 5: headerReady };

// steps_header_cont (16,5): [x, width, inactive image, active image]
const STEPS: [number, number, string, string][] = [
    [0, 84, gcreate10, gcreate11],
    [77, 83, gcreate20, gcreate21],
    [153, 83, gcreate20, gcreate21],
    [227, 133, gcreate40, gcreate41]
];

// Offsets from the floor-centred caption to where the native client draws it (measured from the v75 screenshots).
const LABEL_SHIFT = [-1, 1, 0, 8];

interface GroupManagementWindowProps {
    /** Creation steps 1-4 draw the step header; editing draws the tab context (tabs live in the manager). */
    step?: number;
    caption: string;
    description: string;
    headerImageStep: number;
    uniqueKey: string;
    onClose: () => void;
    tabs?: ReactNode;
    children: ReactNode;
}

/** group_management_window: 392x497, header_cont 110px, step containers addressed in client coordinates. */
export const GroupManagementWindow: FC<GroupManagementWindowProps> = ({
    step = 0,
    caption,
    description,
    headerImageStep,
    uniqueKey,
    onClose,
    tabs = null,
    children
}) =>
{
    const [alert, setAlert] = useState<GroupAlert>(null);
    // Without the step header (edit mode) the header band's picture and captions sit higher.
    const isEditing = step === 0;

    return (
        <GroupAlertContext.Provider value={setAlert}>
            <OctaneCardView
                aria-label={LocalizeText('group.window.title')}
                className="octane-group-native"
                frameStyle={3}
                isResizable={false}
                role="dialog"
                uniqueKey={uniqueKey}
            >
                <OctaneCardHeaderView headerText="" onCloseClick={onClose} />
                <GroupWindowTitle title={LocalizeText('group.window.title')} width={392} />
                <div className="octane-group-native__client">
                    <div className="octane-group-native__header" />
                    {step > 0 && (
                        <div className="octane-group-native__steps">
                            {STEPS.map(([x, width, inactive, active], index) =>
                            {
                                const isActive = step === index + 1;

                                return (
                                    <div key={index} className={`octane-group-native__step-tab${isActive ? ' is-active' : ''}`} style={{ left: x, width }}>
                                        <img alt="" draggable={false} src={isActive ? active : inactive} />
                                        <GroupText
                                            align="center"
                                            background={index === 3 ? 0xf4b800 : isActive ? 0x255c77 : 0x408caf}
                                            overrides={flatText(13, { bold: true, color: 0xffffff })}
                                            text={LocalizeText(`group.create.steplabel.${index + 1}`)}
                                            width={index === 3 ? 108 : width}
                                            x={LABEL_SHIFT[index]}
                                            y={isActive ? 5 : 9}
                                        />
                                        {index === 3 && (
                                            <img
                                                alt=""
                                                className="octane-group-native__credit"
                                                draggable={false}
                                                src={creditIcon}
                                                style={{ top: isActive ? 6 : 10 }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    <img
                        alt=""
                        className="octane-group-native__header-image"
                        draggable={false}
                        src={HEADER_IMAGES[headerImageStep]}
                        style={{ top: isEditing ? 0 : 36 }}
                    />
                    <GroupText
                        background={GROUP_HEADER_SURFACE}
                        height={24}
                        overrides={flatText(20, { bold: true, color: 0xffffff })}
                        text={caption}
                        width={263}
                        x={126}
                        y={isEditing ? 23 : 43}
                    />
                    <GroupText
                        background={GROUP_HEADER_SURFACE}
                        height={40}
                        overrides={flatText(13, { color: 0xffffff })}
                        wrap
                        text={description}
                        width={232}
                        x={126}
                        y={isEditing ? 52 : 69}
                    />
                    {tabs}
                    {children}
                </div>
            </OctaneCardView>
            {alert && <GroupNativeAlertView alert={alert} onClose={() => setAlert(null)} />}
        </GroupAlertContext.Provider>
    );
};
