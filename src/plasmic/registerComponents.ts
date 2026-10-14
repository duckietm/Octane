import { Base, Button, Column, Flex, Text } from '../common';

// Octane primitives exposed to Plasmic Studio. Only presentational components from
// src/common are registered: anything that needs the renderer (GetRoomEngine, hooks on
// SharedHookRegistry, …) cannot run inside the lightweight host page.
export const registerOctaneComponents = (register: (component: any, meta: any) => void) => {
    register(Flex, {
        name: 'OctaneFlex',
        importPath: '@/common',
        importName: 'Flex',
        props: {
            children: 'slot',
            column: 'boolean',
            reverse: 'boolean',
            center: 'boolean',
            gap: { type: 'number' }
        }
    });

    register(Column, {
        name: 'OctaneColumn',
        importPath: '@/common',
        importName: 'Column',
        props: { children: 'slot', gap: { type: 'number' }, center: 'boolean' }
    });

    register(Base, {
        name: 'OctaneBase',
        importPath: '@/common',
        importName: 'Base',
        props: { children: 'slot' }
    });

    register(Text, {
        name: 'OctaneText',
        importPath: '@/common',
        importName: 'Text',
        props: {
            children: 'slot',
            bold: 'boolean',
            small: 'boolean',
            center: 'boolean',
            variant: { type: 'string' }
        }
    });

    register(Button, {
        name: 'OctaneButton',
        importPath: '@/common',
        importName: 'Button',
        props: {
            children: 'slot',
            active: 'boolean',
            disabled: 'boolean',
            variant: {
                type: 'choice',
                options: ['primary', 'success', 'danger', 'warning', 'secondary', 'gray', 'black', 'dark']
            },
            size: { type: 'choice', options: ['sm', 'lg'] }
        }
    });
};
