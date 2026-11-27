import { describe, expect, it } from 'vitest';
import { parseNavigatorSearchLink } from './NavigatorSearchLink';

const parse = (link: string) => parseNavigatorSearchLink(link.split('/').slice(2));

describe('parseNavigatorSearchLink', () => {
    it('opens the tab a link names (the Me menu\'s "Rooms" entry)', () => {
        expect(parse('navigator/search/myworld_view')).toEqual({ code: 'myworld_view', filter: '' });
        expect(parse('navigator/search/hotel_view')).toEqual({ code: 'hotel_view', filter: '' });
    });

    it("keeps the text after the tab as that tab's search", () => {
        expect(parse('navigator/search/hotel_view/owner:DeployCheck')).toEqual({ code: 'hotel_view', filter: 'owner:DeployCheck' });
        expect(parse('navigator/search/hotel_view/group:')).toEqual({ code: 'hotel_view', filter: 'group:' });
        expect(parse('navigator/search/hotel_view/a/b')).toEqual({ code: 'hotel_view', filter: 'a/b' });
    });

    it('searches the hotel view for anything else, as before', () => {
        expect(parse('navigator/search/popular')).toEqual({ code: 'hotel_view', filter: 'popular' });
        expect(parse('navigator/search/groups')).toEqual({ code: 'hotel_view', filter: 'groups' });
        expect(parse('navigator/search/My_View of the sea')).toEqual({ code: 'hotel_view', filter: 'My_View of the sea' });
        expect(parse('navigator/search')).toEqual({ code: 'hotel_view', filter: '' });
    });
});
