# Reference archetypes

Finished, reviewed layouts built only from the library (surfaces + blocks + shadcn). Start every page by
copying the closest archetype from `src/pages/`, then replace the mock data — do not re-author layout.

| archetype | file | use for |
|---|---|---|
| collection | pages/collection.tsx | resource list: toolbar + framed DataTable |
| detail | pages/detail.tsx | one resource: properties, tabs, related list, disclosure rows |
| form | pages/form.tsx | create / edit page: field sets, field pairs, footer actions |
| settings | pages/settings.tsx | SectionLayout (full-height divider) + sections |
| list-detail | pages/list-detail.tsx | conversations / inbox: pane + transcript + composer |
| empty | pages/empty.tsx | collection with nothing in it yet |

Screenshots of these pages are **not shipped in the repo** (they would bloat git history). Render them
on demand: `scripts/review_visual.py compose --reference-base <url>` screenshots the running reference
app and composes your page next to it (step 07); `capture-reference --out /tmp/ref-shots` writes a set
for eyeballing while authoring a package.

Render the reference app (scratch Vite app with the library installed, step 02; copy `src/` over it):

    npm run dev -- --port 5180 &
