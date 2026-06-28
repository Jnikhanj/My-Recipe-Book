# Recipe Keeper

A local-first visual recipe app for iPhone Safari, designed to be hosted free on GitHub Pages.

## What it does

- Home screen shows recipes as a plate-style visual grid.
- Add/edit recipes with photo, compact labels, cuisine, cook time and plate backdrop.
- Round dish/plate shape is used as the default; the separate shape picker has been removed.
- Serves and prep time have been removed from the add/edit form to keep the entry screen faster.
- Ingredients are added as structured rows: ingredient, amount, unit and note.
- Ingredient suggestions appear while typing, using common ingredients and ingredients already saved in your recipes.
- Quick paste can import ingredient lines, for example `500g chicken`, `1 cup yoghurt`, or `Salt to taste`.
- Method is step-based instead of one large notes box.
- Quick paste can also import method steps, one line per step.
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

1. Upload all files from this folder to the repository root.
2. Go to **Settings > Pages**.
3. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
4. Open the GitHub Pages URL on iPhone Safari.
5. Tap **Share > Add to Home Screen**.

## Updating an existing GitHub Pages app

Replace the existing files in your repository with these updated files. The service worker cache name has been updated to `recipe-keeper-v4`, so Safari should refresh the app after the new files are deployed. If the old screen still appears, close the app, reopen the Safari URL, refresh once, then open it from the Home Screen again.

## Important backup note

Recipes are stored locally in Safari on the device. GitHub only hosts the app files. Export a backup regularly from Settings, especially before clearing Safari website data or changing phones.

## v4 refinement notes

- Prep time removed; cook time now sits beside cuisine.
- Recipe detail plate reduced in size.
- Bottom navigation is fixed to the bottom edge instead of floating as a pill.
- Home grid plate sizing is fixed/consistent so rows align better.
- Sort control now uses a clean SVG icon instead of emoji/text.
- Ingredient and method helper wording removed for a cleaner add screen.
- Overall spacing, chip size and visual density have been tightened.


## Version 4 refinements

- Added functional portion scaling. Each recipe stores the original number of portions and the recipe view can scale ingredients up or down.
- Ingredient amounts support decimals and fractions such as `1/4`, `1/2`, `3/4`, and `1 1/2`.
- Shopping list generation uses the currently selected portion size.
- Ingredients and method steps can be reordered using up/down controls.
- Added a Scale toggle for ingredients that should not change with portions, such as salt to taste, garnish, and oil as required.
- Replaced Backup tab with Settings.
- Added theme customisation under Settings.
- Backup and restore remain available inside Settings.
