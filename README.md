# Recipe Keeper

A local-first visual recipe app for iPhone Safari, designed to be hosted free on GitHub Pages.

## What it does

- Home screen shows recipes as a clean plate-style visual grid.
- Add/edit recipes with photo, compact labels, cuisine, cook time, portions and plate backdrop.
- Ingredients are added as structured rows: ingredient, amount, unit, note and scale setting.
- Ingredient amounts support decimals and fractions such as `1/4`, `1/2`, `3/4`, and `1 1/2`.
- Recipe view can scale ingredients up or down based on portions.
- Shopping list generation uses the currently selected portion size.
- Ingredient suggestions appear while typing, using common ingredients and ingredients already saved in your recipes.
- Quick paste can import ingredient lines, for example `500g chicken`, `1 cup yoghurt`, or `Salt to taste`.
- Method is step-based instead of one large notes box.
- Quick paste can also import method steps, one line per step.
- Ingredients and method steps can be reordered using a clean reorder mode with drag handles.
- Store recipes locally on the device using IndexedDB.
- Mark recipes as cooked and track cooked count.
- Add recipe ingredients to a shopping list.
- Settings includes theme selection, display density, backup, restore and data management.
- Works as a PWA: open in Safari, then use Share > Add to Home Screen.

## v6 design refinements

- Home header is more compact.
- Recipe grid has more consistent tile height and plate sizing.
- Recipe cards now show cleaner text such as `Cooked 3x`.
- Added a Recently Cooked row on the home screen.
- Added a cleaner sort menu with Newest, A-Z, Most cooked, Favourites first and Cuisine sorting.
- Recipe detail page uses a smaller hero plate so ingredients and method are easier to access.
- Added Display Density in Settings: Comfortable or Compact.
- Settings icons are now consistent SVG icons instead of emoji-style icons.
- Empty states are cleaner and context-aware.
- Plate picker and section spacing have been visually tightened.

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

Replace the existing files in your repository with these updated files. The service worker cache name has been updated to `recipe-keeper-v6`, so Safari should refresh the app after the new files are deployed. If the old screen still appears, close the app, reopen the Safari URL, refresh once, then open it from the Home Screen again.

## Important backup note

Recipes are stored locally in Safari on the device. GitHub only hosts the app files. Export a backup regularly from Settings, especially before clearing Safari website data or changing phones.
