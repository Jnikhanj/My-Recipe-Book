const app = document.getElementById("app");
const toastEl = document.getElementById("toast");
const importFile = document.getElementById("importFile");

const DB_NAME = "recipeKeeperLocalDB";
const DB_VERSION = 1;
const DEFAULT_LABELS = ["Indian", "Main", "Appetizer", "Dessert", "Quick", "Breakfast", "Lunch", "Dinner", "Drinks"];
const SHAPES = [
  { id: "circle", label: "Circle" },
  { id: "flower", label: "Flower" },
  { id: "soft", label: "Soft" },
  { id: "scallop", label: "Scallop" },
  { id: "hex", label: "Hex" },
  { id: "squircle", label: "Squircle" },
];
const PLATES = [
  { id: "none", label: "None" },
  { id: "checker", label: "Checker" },
  { id: "peach", label: "Peach dots" },
  { id: "blueflower", label: "Blue flower" },
  { id: "redpolka", label: "Red dots" },
  { id: "navystripe", label: "Navy stripe" },
  { id: "garden", label: "Garden" },
  { id: "greenrim", label: "Green rim" },
];

const state = {
  recipes: [],
  shopping: [],
  view: "home",
  activeLabel: "All",
  query: "",
  listTab: "toBuy",
  sort: "recent",
  formPhoto: "",
};

let dbPromise;
let toastTimer;

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("recipes")) {
        const store = db.createObjectStore("recipes", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
        store.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains("shopping")) {
        const store = db.createObjectStore("shopping", { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
    };
  });
  return dbPromise;
}

function req(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAll(storeName) {
  const db = await openDb();
  return req(db.transaction(storeName, "readonly").objectStore(storeName).getAll());
}

async function putItem(storeName, item) {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(item);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteItem(storeName, id) {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStore(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadData() {
  state.recipes = await getAll("recipes");
  state.shopping = await getAll("shopping");
  if (!state.recipes.length && !localStorage.getItem("recipeKeeperSeeded")) {
    await seedDemoRecipes();
    localStorage.setItem("recipeKeeperSeeded", "yes");
    state.recipes = await getAll("recipes");
  }
}

async function seedDemoRecipes() {
  const now = new Date().toISOString();
  const demos = [
    { name: "Butter Chicken", labels: ["Indian", "Dinner", "Main"], cuisine: "Indian", prep: "20 min", cook: "40 min", serves: 4, emoji: "🍛", plate: "checker", shape: "circle", cookedCount: 2, ingredients: "500 g chicken\n1 cup yoghurt\n2 onion\nTomato puree\nButter\nGaram masala\nCream\nFresh coriander", method: "Marinate chicken with yoghurt and spices.\nCook onion, tomato puree and butter until thick.\nAdd chicken and simmer until cooked.\nFinish with cream and coriander.", notes: "Use less chilli if cooking for family." },
    { name: "Egg Fried Rice", labels: ["Quick", "Lunch"], cuisine: "Chinese", prep: "10 min", cook: "15 min", serves: 2, emoji: "🍚", plate: "blueflower", shape: "flower", cookedCount: 1, ingredients: "Cooked rice\n2 eggs\nSoy sauce\nSpring onion\nMixed vegetables", method: "Scramble eggs.\nStir fry vegetables.\nAdd rice and soy sauce.\nMix eggs through and serve hot." },
    { name: "Masala Chai", labels: ["Drinks", "Indian", "Quick"], cuisine: "Indian", prep: "2 min", cook: "8 min", serves: 2, emoji: "☕", plate: "greenrim", shape: "soft", cookedCount: 5, ingredients: "Water\nMilk\nTea leaves\nGinger\nCardamom\nSugar", method: "Boil water with ginger and cardamom.\nAdd tea leaves and milk.\nSimmer, strain and serve." },
    { name: "Chole", labels: ["Indian", "Main", "Dinner"], cuisine: "Indian", prep: "15 min", cook: "45 min", serves: 4, emoji: "🥘", plate: "redpolka", shape: "scallop", cookedCount: 3, ingredients: "Chickpeas\nOnion\nTomato\nGinger garlic paste\nChole masala\nCoriander", method: "Cook onion and tomato masala.\nAdd chickpeas and spices.\nSimmer until thick." },
    { name: "Mango Sticky Rice", labels: ["Dessert"], cuisine: "Thai", prep: "15 min", cook: "25 min", serves: 3, emoji: "🥭", plate: "navystripe", shape: "hex", cookedCount: 0, ingredients: "Sticky rice\nCoconut milk\nSugar\nSalt\nMango", method: "Steam sticky rice.\nWarm coconut milk with sugar and salt.\nMix with rice and serve with mango." },
    { name: "Aloo Paratha", labels: ["Indian", "Breakfast"], cuisine: "Indian", prep: "25 min", cook: "20 min", serves: 4, emoji: "🫓", plate: "peach", shape: "squircle", cookedCount: 4, ingredients: "Wheat flour\nPotato\nCumin\nCoriander\nGreen chilli\nGhee", method: "Prepare dough and potato filling.\nRoll, fill and cook on tawa with ghee." },
  ];
  for (const demo of demos) {
    await putItem("recipes", { id: uid(), photo: "", favorite: demo.cookedCount > 2, createdAt: now, updatedAt: now, lastCooked: "", notes: "", ...demo });
  }
}

function h(value) {
  return String(value ?? "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function safePhoto(photo) {
  return typeof photo === "string" && photo.startsWith("data:image/") ? photo : "";
}

function photoStyle(photo) {
  const safe = safePhoto(photo);
  return safe ? `style="background-image:url('${safe}')"` : "";
}

function initials(name) {
  return String(name || "Recipe").trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "R";
}

function icon(name) {
  const icons = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10.5V20h14v-9.5"/><path d="M9 20v-6h6v6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 5v14M5 12h14"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    backup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>',
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18 9 12l6-6"/></svg>',
    close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 13 4 4L19 7"/></svg>',
    camera: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z"/><circle cx="12" cy="13" r="4"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>',
  };
  return icons[name] || "";
}

function plateHtml(recipe, size = "tile") {
  const shape = recipe.shape || "circle";
  const plate = recipe.plate || "checker";
  const fallback = recipe.emoji ? h(recipe.emoji) : h(initials(recipe.name));
  const photo = safePhoto(recipe.photo);
  return `
    <div class="plate ${size} plate-${h(plate)}" aria-hidden="true">
      <div class="dish-img shape-${h(shape)} ${photo ? "has-photo" : ""}" ${photoStyle(photo)}>${fallback}</div>
    </div>
  `;
}

function allLabels() {
  const fromRecipes = new Set();
  state.recipes.forEach(r => (r.labels || []).forEach(label => fromRecipes.add(label)));
  return [...new Set([...DEFAULT_LABELS, ...fromRecipes])];
}

function labelCount(label) {
  if (label === "All") return state.recipes.length;
  if (label === "Favourites") return state.recipes.filter(r => r.favorite).length;
  return state.recipes.filter(r => (r.labels || []).includes(label)).length;
}

function filteredRecipes() {
  const query = state.query.trim().toLowerCase();
  let recipes = [...state.recipes];
  if (state.activeLabel === "Favourites") recipes = recipes.filter(r => r.favorite);
  else if (state.activeLabel !== "All") recipes = recipes.filter(r => (r.labels || []).includes(state.activeLabel));
  if (query) {
    recipes = recipes.filter(r => [r.name, r.cuisine, (r.labels || []).join(" "), r.ingredients, r.method, r.notes]
      .join(" ").toLowerCase().includes(query));
  }
  if (state.sort === "name") recipes.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  else recipes.sort((a, b) => String(b.lastCooked || b.updatedAt || b.createdAt).localeCompare(String(a.lastCooked || a.updatedAt || a.createdAt)));
  return recipes;
}

function recipesGridHtml() {
  const recipes = filteredRecipes();
  if (!recipes.length) {
    return `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🍽️</div><b>No recipes found</b><span>Try another search or add a new dish.</span></div>`;
  }
  return recipes.map(recipe => `
    <button class="recipe-tile" data-action="open" data-id="${h(recipe.id)}" aria-label="Open ${h(recipe.name)}">
      ${recipe.favorite ? '<span class="favorite-dot">★</span>' : ""}
      ${plateHtml(recipe, "tile")}
      <div class="tile-name">${h(recipe.name)}</div>
      <div class="tile-meta">${recipe.cookedCount ? `Had ${h(recipe.cookedCount)} time${recipe.cookedCount === 1 ? "" : "s"}` : h((recipe.labels || [])[0] || recipe.cuisine || "Recipe")}</div>
    </button>
  `).join("");
}

function navHtml(active = state.view) {
  return `
    <nav class="bottom-nav" aria-label="Main navigation">
      <button class="nav-item ${active === "home" && state.activeLabel !== "Favourites" ? "active" : ""}" data-action="nav" data-view="home">${icon("home")}<span>Menu</span></button>
      <button class="nav-item ${active === "home" && state.activeLabel === "Favourites" ? "active" : ""}" data-action="favourites">${icon("heart")}<span>Favourites</span></button>
      <button class="add-button" data-action="new" aria-label="Add recipe">${icon("plus")}</button>
      <button class="nav-item ${active === "shopping" ? "active" : ""}" data-action="nav" data-view="shopping">${icon("list")}<span>List</span></button>
      <button class="nav-item ${active === "backup" ? "active" : ""}" data-action="nav" data-view="backup">${icon("backup")}<span>Backup</span></button>
    </nav>
  `;
}

function renderHome() {
  const labels = ["All", "Favourites", ...allLabels()].filter((v, i, arr) => arr.indexOf(v) === i && (v === "All" || v === "Favourites" || labelCount(v) > 0));
  app.innerHTML = `
    <section class="app-shell">
      <div class="top-row">
        <div>
          <h1>My menu</h1>
          <p class="subtitle">A visual cookbook for your home-cooked dishes.</p>
        </div>
        <button class="icon-btn" data-action="sort" aria-label="Change sort order">${state.sort === "name" ? "A↓" : "↕"}</button>
      </div>
      <div class="search-wrap">
        ${icon("search")}
        <input id="searchInput" type="search" placeholder="Search dishes or ingredients" value="${h(state.query)}" autocomplete="off" />
      </div>
      <div class="chips" aria-label="Recipe categories">
        ${labels.map(label => `<button class="chip ${state.activeLabel === label ? "active" : ""}" data-action="filter" data-label="${h(label)}">${h(label)} (${labelCount(label)})</button>`).join("")}
      </div>
      <div id="recipeGrid" class="recipe-grid">${recipesGridHtml()}</div>
      ${navHtml("home")}
    </section>
  `;
  const searchInput = document.getElementById("searchInput");
  searchInput.addEventListener("input", event => {
    state.query = event.target.value;
    document.getElementById("recipeGrid").innerHTML = recipesGridHtml();
  });
}

function lineArray(text) {
  return String(text || "").split(/\n+/).map(x => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
}

function detailHtml(recipe) {
  const labels = (recipe.labels || []).join(" · ");
  const ingredients = lineArray(recipe.ingredients);
  const method = lineArray(recipe.method);
  return `
    <section class="app-shell">
      <div class="toolbar">
        <button class="icon-btn" data-action="back-home" aria-label="Back">${icon("back")}</button>
        <div class="toolbar-title">Recipe</div>
        <button class="icon-btn" data-action="toggle-fav" data-id="${h(recipe.id)}" aria-label="Toggle favourite">${recipe.favorite ? "★" : "☆"}</button>
      </div>
      ${plateHtml(recipe, "hero")}
      <h2 class="hero-title">${h(recipe.name)}</h2>
      <div class="hero-meta">${h(labels || recipe.cuisine || "Recipe")}</div>
      <div class="stat-grid">
        <div class="stat"><b>${h(recipe.prep || "—")}</b><span>Prep</span></div>
        <div class="stat"><b>${h(recipe.cook || "—")}</b><span>Cook</span></div>
        <div class="stat"><b>${h(recipe.serves || "—")}</b><span>Serves</span></div>
      </div>
      <div class="card">
        <div class="section-head">
          <div class="section-title" style="margin:0">Ingredients</div>
          <button class="chip accent" data-action="add-shopping" data-id="${h(recipe.id)}">Add to list</button>
        </div>
        <div class="line-list" style="margin-top:13px">
          ${ingredients.length ? ingredients.map(item => `<label class="check-row"><input type="checkbox"><span>${h(item)}</span></label>`).join("") : '<p class="small-muted">No ingredients added yet.</p>'}
        </div>
        <div class="section-title">Method</div>
        ${method.length ? `<ol class="method-list">${method.map(step => `<li>${h(step)}</li>`).join("")}</ol>` : '<p class="small-muted">No method added yet.</p>'}
        ${recipe.notes ? `<div class="section-title">Notes</div><div class="note-box">${h(recipe.notes).replace(/\n/g, "<br>")}</div>` : ""}
        <div class="action-row">
          <button class="btn primary" data-action="mark-cooked" data-id="${h(recipe.id)}">Mark cooked</button>
          <button class="btn" data-action="edit" data-id="${h(recipe.id)}">${icon("edit")} Edit</button>
        </div>
        <button class="btn danger full" data-action="delete-recipe" data-id="${h(recipe.id)}">Delete recipe</button>
      </div>
      ${navHtml("detail")}
    </section>
  `;
}

function renderDetail(id) {
  const recipe = state.recipes.find(r => r.id === id);
  if (!recipe) return renderHome();
  app.innerHTML = detailHtml(recipe);
}

function formLabelsHtml(selectedLabels) {
  const labels = [...new Set([...DEFAULT_LABELS, ...allLabels(), ...selectedLabels])].filter(label => label !== "All" && label !== "Favourites");
  return labels.map(label => `<button type="button" class="label-chip ${selectedLabels.includes(label) ? "active" : ""}" data-label-chip="${h(label)}">${h(label)}</button>`).join("") + `<button type="button" class="label-chip" data-action="add-label">+</button>`;
}

function renderForm(id = null) {
  const recipe = id ? state.recipes.find(r => r.id === id) : null;
  const selectedLabels = recipe?.labels?.length ? recipe.labels : ["Main"];
  const shape = recipe?.shape || "circle";
  const plate = recipe?.plate || "checker";
  state.formPhoto = recipe?.photo || "";
  const previewRecipe = { name: recipe?.name || "New Dish", emoji: recipe?.emoji || "🍽️", shape, plate, photo: state.formPhoto };
  app.innerHTML = `
    <section class="app-shell form-shell">
      <div class="toolbar">
        <button class="icon-btn" data-action="cancel-form" aria-label="Cancel">${icon("close")}</button>
        <div class="toolbar-title">${recipe ? "Edit dish" : "Add a dish"}</div>
        <button class="icon-btn primary" data-action="save-form" aria-label="Save">${icon("check")}</button>
      </div>
      <form id="recipeForm" novalidate>
        <input type="hidden" id="recipeId" value="${h(recipe?.id || "")}" />
        <input type="hidden" id="shapeValue" value="${h(shape)}" />
        <input type="hidden" id="plateValue" value="${h(plate)}" />
        <div class="photo-edit">
          <div id="previewPlate">${plateHtml(previewRecipe, "preview")}</div>
          <label class="photo-pick" aria-label="Add photo">
            ${icon("camera")}
            <input id="photoInput" type="file" accept="image/*" hidden />
          </label>
        </div>
        <div class="form-section">
          <label for="nameInput">Dish name</label>
          <input id="nameInput" required maxlength="80" placeholder="Dish name (required)" value="${h(recipe?.name || "")}" />
        </div>
        <div class="form-section">
          <div class="field-label">Label</div>
          <div id="labelWrap" class="label-wrap">${formLabelsHtml(selectedLabels)}</div>
        </div>
        <div class="form-section">
          <label for="cuisineInput">Cuisine</label>
          <input id="cuisineInput" placeholder="e.g. Indian, Thai, Italian" value="${h(recipe?.cuisine || "")}" />
        </div>
        <div class="form-section form-grid">
          <div><label for="prepInput">Prep time</label><input id="prepInput" placeholder="e.g. 20 min" value="${h(recipe?.prep || "")}" /></div>
          <div><label for="cookInput">Cook time</label><input id="cookInput" placeholder="e.g. 40 min" value="${h(recipe?.cook || "")}" /></div>
        </div>
        <div class="form-section">
          <div class="field-label">Serves</div>
          <div class="stepper">
            <button type="button" data-action="serves-minus">−</button>
            <output id="servesOutput">${h(recipe?.serves || 2)}</output>
            <button type="button" data-action="serves-plus">+</button>
          </div>
        </div>
        <div class="form-section">
          <div class="field-label">Shape</div>
          <div class="option-row">
            ${SHAPES.map(s => `<button type="button" class="shape-option ${shape === s.id ? "active" : ""}" title="${h(s.label)}" data-shape="${h(s.id)}"><span class="shape-sample shape-${h(s.id)}"></span></button>`).join("")}
          </div>
        </div>
        <div class="form-section">
          <div class="field-label">Plate backdrop</div>
          <div class="plate-row">
            ${PLATES.map(p => `<button type="button" class="plate-option ${plate === p.id ? "active" : ""}" title="${h(p.label)}" data-plate="${h(p.id)}"><span class="plate plate-${h(p.id)}"><span class="dish-img shape-circle" style="width:48%;height:48%;font-size:12px"> </span></span></button>`).join("")}
          </div>
        </div>
        <div class="form-section">
          <label for="ingredientsInput">Ingredients</label>
          <textarea id="ingredientsInput" placeholder="Enter ingredients, one per line">${h(recipe?.ingredients || "")}</textarea>
        </div>
        <div class="form-section">
          <label for="methodInput">Method</label>
          <textarea id="methodInput" placeholder="Write the method / steps">${h(recipe?.method || "")}</textarea>
        </div>
        <div class="form-section">
          <label for="notesInput">Notes</label>
          <textarea id="notesInput" placeholder="Optional notes or recipe changes">${h(recipe?.notes || "")}</textarea>
        </div>
        <button class="btn primary full" type="button" data-action="save-form">Save recipe</button>
      </form>
    </section>
  `;
  attachFormEvents();
}

function updatePreview() {
  const name = document.getElementById("nameInput")?.value || "New Dish";
  const shape = document.getElementById("shapeValue")?.value || "circle";
  const plate = document.getElementById("plateValue")?.value || "checker";
  const recipe = { name, emoji: "🍽️", shape, plate, photo: state.formPhoto };
  const preview = document.getElementById("previewPlate");
  if (preview) preview.innerHTML = plateHtml(recipe, "preview");
}

function attachFormEvents() {
  document.getElementById("nameInput")?.addEventListener("input", updatePreview);
  document.getElementById("photoInput")?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      state.formPhoto = await compressImage(file);
      updatePreview();
      toast("Photo added");
    } catch (error) {
      console.error(error);
      toast("Could not read photo");
    }
  });
}

async function compressImage(file) {
  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = imageUrl;
  await image.decode();
  const max = 900;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(imageUrl);
  return canvas.toDataURL("image/jpeg", 0.78);
}

async function saveForm() {
  const form = document.getElementById("recipeForm");
  if (!form) return;
  const id = document.getElementById("recipeId").value || uid();
  const existing = state.recipes.find(r => r.id === id);
  const name = document.getElementById("nameInput").value.trim();
  if (!name) {
    toast("Dish name is required");
    document.getElementById("nameInput").focus();
    return;
  }
  const labels = [...document.querySelectorAll("[data-label-chip].active")].map(btn => btn.dataset.labelChip).filter(Boolean);
  const now = new Date().toISOString();
  const recipe = {
    id,
    name,
    labels: labels.length ? labels : ["Main"],
    cuisine: document.getElementById("cuisineInput").value.trim(),
    prep: document.getElementById("prepInput").value.trim(),
    cook: document.getElementById("cookInput").value.trim(),
    serves: Number(document.getElementById("servesOutput").textContent) || 1,
    ingredients: document.getElementById("ingredientsInput").value.trim(),
    method: document.getElementById("methodInput").value.trim(),
    notes: document.getElementById("notesInput").value.trim(),
    shape: document.getElementById("shapeValue").value || "circle",
    plate: document.getElementById("plateValue").value || "checker",
    photo: state.formPhoto || "",
    emoji: existing?.emoji || "",
    favorite: existing?.favorite || false,
    cookedCount: existing?.cookedCount || 0,
    lastCooked: existing?.lastCooked || "",
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await putItem("recipes", recipe);
  state.recipes = await getAll("recipes");
  state.view = "detail";
  toast("Recipe saved");
  renderDetail(id);
}

function renderShopping() {
  const items = state.shopping
    .filter(item => state.listTab === "all" || (state.listTab === "bought" ? item.bought : !item.bought))
    .sort((a, b) => Number(a.bought) - Number(b.bought) || String(a.createdAt).localeCompare(String(b.createdAt)));
  app.innerHTML = `
    <section class="app-shell">
      <div class="toolbar">
        <button class="icon-btn" data-action="back-home" aria-label="Back">${icon("back")}</button>
        <div class="toolbar-title">Shopping list</div>
        <button class="icon-btn" data-action="add-item" aria-label="Add item">+</button>
      </div>
      <div class="list-tabs">
        <button class="chip ${state.listTab === "all" ? "active" : ""}" data-action="list-tab" data-tab="all">All</button>
        <button class="chip ${state.listTab === "toBuy" ? "active" : ""}" data-action="list-tab" data-tab="toBuy">To buy</button>
        <button class="chip ${state.listTab === "bought" ? "active" : ""}" data-action="list-tab" data-tab="bought">Bought</button>
      </div>
      <div class="card">
        ${items.length ? items.map(item => `
          <div class="list-item ${item.bought ? "done" : ""}">
            <input type="checkbox" ${item.bought ? "checked" : ""} data-action="toggle-item" data-id="${h(item.id)}" aria-label="Mark ${h(item.text)}">
            <div class="item-text">${h(item.text)}</div>
            <button class="item-delete" data-action="delete-item" data-id="${h(item.id)}" aria-label="Delete item">×</button>
          </div>
        `).join("") : '<div class="empty"><div class="empty-icon">🛒</div><b>Your list is empty</b><span>Add ingredients from a recipe or add an item manually.</span></div>'}
      </div>
      <button class="btn primary full" data-action="share-list">Share list</button>
      <button class="btn full" data-action="clear-bought">Clear completed</button>
      ${navHtml("shopping")}
    </section>
  `;
}

function renderBackup() {
  app.innerHTML = `
    <section class="app-shell">
      <div class="toolbar">
        <button class="icon-btn" data-action="back-home" aria-label="Back">${icon("back")}</button>
        <div class="toolbar-title">Backup & restore</div>
        <button class="icon-btn" data-action="new" aria-label="Add recipe">+</button>
      </div>
      <div class="backup-hero">
        <div class="shield">🛡️</div>
        <h2 style="margin:0 0 8px">Your recipes are local</h2>
        <p class="small-muted" style="margin:0">Recipes and photos are stored on this iPhone/iPad browser. Export a backup regularly, especially before clearing Safari website data.</p>
      </div>
      <h3 class="section-title">Export / backup</h3>
      <button class="settings-row" data-action="export-full"><span class="settings-icon">⬇️</span><span><b>Export full backup</b><small>Includes recipes, photos and shopping list</small></span><span>›</span></button>
      <button class="settings-row" data-action="export-text"><span class="settings-icon">📝</span><span><b>Export recipe text only</b><small>Smaller JSON file without photos</small></span><span>›</span></button>
      <h3 class="section-title">Import / restore</h3>
      <button class="settings-row" data-action="import-backup"><span class="settings-icon">📥</span><span><b>Import backup</b><small>Restore from a JSON backup file</small></span><span>›</span></button>
      <h3 class="section-title">Other</h3>
      <button class="settings-row" data-action="clear-recipes"><span class="settings-icon warning">🗑️</span><span><b>Clear all recipes</b><small class="warning">This cannot be undone unless you have a backup</small></span><span>›</span></button>
      ${navHtml("backup")}
    </section>
  `;
}

function render() {
  if (state.view === "shopping") return renderShopping();
  if (state.view === "backup") return renderBackup();
  return renderHome();
}

function toast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2300);
}

async function toggleFavourite(id) {
  const recipe = state.recipes.find(r => r.id === id);
  if (!recipe) return;
  recipe.favorite = !recipe.favorite;
  recipe.updatedAt = new Date().toISOString();
  await putItem("recipes", recipe);
  state.recipes = await getAll("recipes");
}

async function markCooked(id) {
  const recipe = state.recipes.find(r => r.id === id);
  if (!recipe) return;
  recipe.cookedCount = (Number(recipe.cookedCount) || 0) + 1;
  recipe.lastCooked = new Date().toISOString();
  recipe.updatedAt = recipe.lastCooked;
  await putItem("recipes", recipe);
  state.recipes = await getAll("recipes");
  toast(`Marked cooked ${recipe.cookedCount} time${recipe.cookedCount === 1 ? "" : "s"}`);
  renderDetail(id);
}

async function addRecipeIngredientsToShopping(id) {
  const recipe = state.recipes.find(r => r.id === id);
  if (!recipe) return;
  const ingredients = lineArray(recipe.ingredients);
  if (!ingredients.length) return toast("No ingredients to add");
  const existing = new Set(state.shopping.map(item => item.text.toLowerCase()));
  let added = 0;
  for (const ingredient of ingredients) {
    if (!existing.has(ingredient.toLowerCase())) {
      const item = { id: uid(), text: ingredient, bought: false, createdAt: new Date().toISOString() };
      await putItem("shopping", item);
      existing.add(ingredient.toLowerCase());
      added++;
    }
  }
  state.shopping = await getAll("shopping");
  toast(added ? `${added} item${added === 1 ? "" : "s"} added to list` : "Ingredients already on list");
}

async function addShoppingItem() {
  const text = prompt("Add shopping item");
  if (!text?.trim()) return;
  await putItem("shopping", { id: uid(), text: text.trim(), bought: false, createdAt: new Date().toISOString() });
  state.shopping = await getAll("shopping");
  renderShopping();
}

async function shareShoppingList() {
  const items = state.shopping.filter(item => !item.bought).map(item => `• ${item.text}`).join("\n");
  if (!items) return toast("Nothing to share");
  const text = `Shopping list\n${items}`;
  if (navigator.share) {
    try { await navigator.share({ text }); return; } catch (_) { /* cancelled */ }
  }
  await navigator.clipboard.writeText(text);
  toast("Shopping list copied");
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportData(includePhotos = true) {
  const recipes = state.recipes.map(recipe => includePhotos ? recipe : { ...recipe, photo: "" });
  downloadJson(`recipe-keeper-${includePhotos ? "full" : "text"}-${new Date().toISOString().slice(0, 10)}.json`, {
    app: "Recipe Keeper",
    version: 1,
    exportedAt: new Date().toISOString(),
    includesPhotos: includePhotos,
    recipes,
    shopping: state.shopping,
  });
  toast("Backup exported");
}

async function importBackupFile(file) {
  const text = await file.text();
  const data = JSON.parse(text);
  if (!Array.isArray(data.recipes)) throw new Error("Invalid backup");
  const replace = confirm("Press OK to replace existing data. Press Cancel to merge backup with current data.");
  if (replace) {
    await clearStore("recipes");
    await clearStore("shopping");
  }
  for (const recipe of data.recipes) {
    if (!recipe.name) continue;
    await putItem("recipes", { ...recipe, id: recipe.id || uid(), updatedAt: recipe.updatedAt || new Date().toISOString() });
  }
  if (Array.isArray(data.shopping)) {
    for (const item of data.shopping) {
      if (!item.text) continue;
      await putItem("shopping", { ...item, id: item.id || uid() });
    }
  }
  await loadData();
  state.view = "home";
  toast("Backup imported");
  renderHome();
}

app.addEventListener("click", async event => {
  const target = event.target.closest("[data-action], [data-shape], [data-plate], [data-label-chip]");
  if (!target) return;

  if (target.dataset.labelChip) {
    target.classList.toggle("active");
    return;
  }
  if (target.dataset.shape) {
    document.getElementById("shapeValue").value = target.dataset.shape;
    document.querySelectorAll("[data-shape]").forEach(btn => btn.classList.toggle("active", btn === target));
    updatePreview();
    return;
  }
  if (target.dataset.plate) {
    document.getElementById("plateValue").value = target.dataset.plate;
    document.querySelectorAll("[data-plate]").forEach(btn => btn.classList.toggle("active", btn === target));
    updatePreview();
    return;
  }

  const { action, id, view, label, tab } = target.dataset;
  if (action === "open") { state.view = "detail"; renderDetail(id); }
  if (action === "back-home") { state.view = "home"; renderHome(); }
  if (action === "nav") { state.view = view; if (view === "home") state.activeLabel = "All"; render(); }
  if (action === "favourites") { state.view = "home"; state.activeLabel = "Favourites"; renderHome(); }
  if (action === "new") { state.view = "form"; renderForm(); }
  if (action === "edit") { state.view = "form"; renderForm(id); }
  if (action === "cancel-form") { state.view = "home"; renderHome(); }
  if (action === "save-form") await saveForm();
  if (action === "filter") { state.activeLabel = label; renderHome(); }
  if (action === "sort") { state.sort = state.sort === "name" ? "recent" : "name"; renderHome(); }
  if (action === "toggle-fav") { await toggleFavourite(id); renderDetail(id); }
  if (action === "mark-cooked") await markCooked(id);
  if (action === "add-shopping") await addRecipeIngredientsToShopping(id);
  if (action === "delete-recipe") {
    if (confirm("Delete this recipe?")) {
      await deleteItem("recipes", id);
      state.recipes = await getAll("recipes");
      toast("Recipe deleted");
      state.view = "home";
      renderHome();
    }
  }
  if (action === "serves-minus" || action === "serves-plus") {
    const output = document.getElementById("servesOutput");
    const value = Math.max(1, Number(output.textContent) + (action === "serves-plus" ? 1 : -1));
    output.textContent = value;
  }
  if (action === "add-label") {
    const labelName = prompt("New label name");
    if (!labelName?.trim()) return;
    const wrap = document.getElementById("labelWrap");
    const label = labelName.trim();
    const exists = [...wrap.querySelectorAll("[data-label-chip]")].some(btn => btn.dataset.labelChip.toLowerCase() === label.toLowerCase());
    if (!exists) target.insertAdjacentHTML("beforebegin", `<button type="button" class="label-chip active" data-label-chip="${h(label)}">${h(label)}</button>`);
  }
  if (action === "list-tab") { state.listTab = tab; renderShopping(); }
  if (action === "add-item") await addShoppingItem();
  if (action === "toggle-item") {
    const item = state.shopping.find(x => x.id === id);
    if (item) { item.bought = !item.bought; await putItem("shopping", item); state.shopping = await getAll("shopping"); renderShopping(); }
  }
  if (action === "delete-item") { await deleteItem("shopping", id); state.shopping = await getAll("shopping"); renderShopping(); }
  if (action === "share-list") await shareShoppingList();
  if (action === "clear-bought") {
    const bought = state.shopping.filter(item => item.bought);
    for (const item of bought) await deleteItem("shopping", item.id);
    state.shopping = await getAll("shopping");
    toast("Completed items cleared");
    renderShopping();
  }
  if (action === "export-full") exportData(true);
  if (action === "export-text") exportData(false);
  if (action === "import-backup") importFile.click();
  if (action === "clear-recipes") {
    if (confirm("Clear all recipes? Export a backup first if you want to keep them.")) {
      await clearStore("recipes");
      state.recipes = [];
      toast("All recipes cleared");
      renderHome();
    }
  }
});

importFile.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    await importBackupFile(file);
  } catch (error) {
    console.error(error);
    toast("Import failed. Check backup file.");
  } finally {
    importFile.value = "";
  }
});

async function start() {
  try {
    await loadData();
    renderHome();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("sw.js").catch(console.warn);
    }
  } catch (error) {
    console.error(error);
    app.innerHTML = `<section class="app-shell"><div class="empty"><div class="empty-icon">⚠️</div><b>Could not start app</b><span>${h(error.message)}</span></div></section>`;
  }
}

start();
