# Recipe Keeper

A local-first visual recipe app for iPhone Safari, designed to be hosted free on GitHub Pages.

## What it does

- Home screen shows recipes as a plate-style visual grid.
- Add/edit recipes with photo, labels, shape, and plate backdrop.
- Store recipes locally on the device using IndexedDB.
- Mark recipes as cooked and track cooked count.
- Add recipe ingredients to a shopping list.
- Export/import backup JSON files.
- Works as a PWA: open in Safari, then use Share > Add to Home Screen.

## Files

- `index.html` - app shell
- `styles.css` - mobile-first UI design
- `app.js` - app logic and local storage
- `manifest.webmanifest` - PWA metadata
- `sw.js` - offline caching
- `icons/` - home screen icons

## GitHub Pages setup

1. Create a new GitHub repository, for example `recipe-keeper`.
2. Upload all files from this folder to the repository root.
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Open the GitHub Pages URL on iPhone Safari.
6. Tap **Share > Add to Home Screen**.

## Important backup note

Recipes are stored locally in Safari on the device. GitHub only hosts the app files. Export a backup regularly from the Backup screen, especially before clearing Safari website data or changing phones.
