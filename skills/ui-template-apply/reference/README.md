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

`../catalog/<package>/reference/<archetype>-<width>-<theme>.png` are screenshots of these pages under the
package theme; `scripts/review_visual.py` puts your page next to them for the visual review (step 07).

Rebuild the screenshots after changing a surface or the theme:

    # in a scratch Vite app with the library installed (step 02), copy src/ over it, then
    npm run dev -- --port 5180 &
    python3 <skill>/scripts/review_visual.py capture-reference --base http://localhost:5180 --package workbench-shell
