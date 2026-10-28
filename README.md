# Oasis

Clinical nutrition decision support tool (PWA).

## Pages

Each section has its own page and URL, e.g. `/adult.html`, `/pediatric.html`, `/enteral.html`.
Switching sections inside the app updates the address bar without a reload, and the browser
back button works. Deep links open straight to the section.

`index.html` is the source of truth. The other pages are generated from it:

```
python3 tools/build_pages.py
```

Run this after every change to `index.html` and commit the regenerated pages and `sitemap.xml`.
To add a section, add it to `PAGES` in `tools/build_pages.py`.
