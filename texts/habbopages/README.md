# Help pages (habbopages)

The pages the client opens for a `habbopages/<page>` link: the chat commands help, the Habbo Club page, the wired
help of the catalogue, and so on.

## Layout

One folder per language, one `.html` file per page:

```
habbopages/
  en/  nl/  de/  fr/  es/  it/  tr/  ar/
    builders-club/faq.html        builders-club/info.html
    camera.html                   chat/commands.html          chat/options.html
    forums.html                   forums/formatting.html
    habboclub.html                hcpayday.html               help.html
    mysterybox/faq.html           navigator.html              wct_uservars.html
    wired_triggers.html           wired_effects.html          wired_conditions.html
    wired_addons.html             wired_leaderboards.html
  chat/chatting/chat_altcodes.png   (picture used by a page, kept at its old address)
```

Every language has the same pages. The languages are the ones the client has UI texts for.

## Installing

Copy the language folders to the folder your client's `habbopages.url` points at (by default
`/gamedata/habbopages/`), so that for example `/gamedata/habbopages/nl/chat/commands.html` exists.

## How the client picks a page

For the link `habbopages/chat/commands` the client tries, in this order, and shows the first it finds:

1. `<player's language>/chat/commands.html`
2. `<hotel's language>/chat/commands.html` (`base.locale` in the renderer config)
3. `en/chat/commands.html`
4. `chat/commands.html`, `chat/commands/index.html`, `chat/commands` (where pages were kept before)

Older links keep working: a link may still end in `.html`, and the former page names (`wired_actie`,
`wired_reactie`, `Wired_voorwaarden`, `Wired_addon`, `Wired_Scorebord`, `chat/chatting`, `commands`) open the page
they have become.

## Writing a page

- Line 1 is the window title. It may end in `|width;height` to size the window (`Mystery Box FAQ|460;480`).
- The rest is HTML. Scripts, styles, forms and frames are removed by the client.
- A link to another page: `<a href="event:habbopages/builders-club/faq">…</a>`.
- A new page needs a file in every language folder; until then the client falls back as described above.
