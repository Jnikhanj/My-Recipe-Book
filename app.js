const app = document.getElementById("app");
const toastEl = document.getElementById("toast");
const importFile = document.getElementById("importFile");

const DB_NAME = "recipeKeeperLocalDB";
const DB_VERSION = 1;
const SETTINGS_KEY = "recipeKeeperSettingsV6";
const LEGACY_SETTINGS_KEY = "recipeKeeperSettingsV5";

const DEFAULT_LABELS = ["Indian", "Main", "Appetizer", "Dessert", "Quick", "Breakfast", "Lunch", "Dinner", "Drinks"];
const PLATES = [
  { id: "none", label: "Plain" },
  { id: "checker", label: "Checker" },
  { id: "peach", label: "Peach dots" },
  { id: "blueflower", label: "Blue flower" },
  { id: "redpolka", label: "Red dots" },
  { id: "navystripe", label: "Navy stripe" },
  { id: "garden", label: "Garden" },
  { id: "greenrim", label: "Green rim" },
];
const UNITS = ["", "g", "kg", "ml", "L", "tsp", "tbsp", "cup", "piece", "pinch", "clove", "inch", "bunch", "packet", "can", "to taste"];
const AMOUNT_CHIPS = ["1/4", "1/2", "3/4", "1", "1 1/2", "2"];
const THEMES = [
  { id: "warm", name: "Warm Cookbook", note: "Current orange and cream look" },
  { id: "cream", name: "Clean Cream", note: "Lighter and minimal" },
  { id: "sage", name: "Sage Green", note: "Soft green kitchen style" },
  { id: "porcelain", name: "Blue Porcelain", note: "White and blue plate style" },
  { id: "dark", name: "Dark Kitchen", note: "Low-light cooking mode" },
];
const COMMON_INGREDIENTS = [
  "Chicken", "Chicken breast", "Chicken thigh", "Egg", "Fish", "Prawns", "Paneer", "Tofu",
  "Onion", "Red onion", "Tomato", "Potato", "Carrot", "Capsicum", "Spinach", "Coriander", "Mint",
  "Garlic", "Ginger", "Ginger garlic paste", "Green chilli", "Red chilli powder", "Turmeric", "Cumin", "Coriander powder",
  "Garam masala", "Chole masala", "Kasuri methi", "Black pepper", "Salt", "Sugar", "Honey",
  "Rice", "Basmati rice", "Flour", "Wheat flour", "Besan", "Pasta", "Noodles", "Bread",
  "Milk", "Cream", "Yoghurt", "Butter", "Ghee", "Oil", "Olive oil", "Coconut milk", "Cheese",
  "Soy sauce", "Vinegar", "Tomato puree", "Lemon juice", "Tea leaves", "Cardamom", "Cinnamon", "Cloves"
];

const state = {
  recipes: [],
  shopping: [],
  view: "home",
  activeLabel: "All",
  query: "",
  listTab: "toBuy",
  sort: "recent",
  sortOpen: false,
  formPhoto: "",
  formIngredients: [],
  formSteps: [],
  reorderIngredients: false,
  reorderSteps: false,
  portionView: {},
  settings: loadSettings(),
};

let dbPromise;
let toastTimer;

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(LEGACY_SETTINGS_KEY) || "{}");
    return {
      theme: saved.theme || "warm",
      density: saved.density || "comfortable",
    };
  } catch (_) {
    return { theme: "warm", density: "comfortable" };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  applyTheme();
}

function applyTheme() {
  document.body.dataset.theme = state.settings.theme || "warm";
  document.body.dataset.density = state.settings.density || "comfortable";
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
    {
      name: "Butter Chicken", labels: ["Indian", "Dinner", "Main"], cuisine: "Indian", cook: "40 min", emoji: "🍛", plate: "checker", cookedCount: 2, portions: 2,
      ingredientsList: [
        { amount: "500", unit: "g", name: "Chicken", note: "boneless", scalable: true },
        { amount: "1/2", unit: "cup", name: "Yoghurt", note: "", scalable: true },
        { amount: "1", unit: "piece", name: "Onion", note: "finely chopped", scalable: true },
        { amount: "1", unit: "cup", name: "Tomato puree", note: "", scalable: true },
        { amount: "1", unit: "tbsp", name: "Butter", note: "", scalable: true },
        { amount: "1", unit: "tsp", name: "Garam masala", note: "", scalable: true },
        { amount: "", unit: "to taste", name: "Salt", note: "", scalable: false },
        { amount: "", unit: "", name: "Fresh coriander", note: "garnish", scalable: false },
      ],
      methodSteps: [
        "Marinate chicken with yoghurt and spices.",
        "Cook onion, tomato puree and butter until thick.",
        "Add chicken and simmer until cooked.",
        "Finish with cream and coriander."
      ],
      notes: "Use less chilli if cooking for family."
    },
    { name: "Egg Fried Rice", labels: ["Quick", "Lunch"], cuisine: "Chinese", cook: "15 min", emoji: "🍚", plate: "blueflower", cookedCount: 1, portions: 2, ingredients: "2 cup cooked rice\n2 eggs\n1 tbsp soy sauce\n1 spring onion\n1 cup mixed vegetables", method: "Scramble eggs.\nStir fry vegetables.\nAdd rice and soy sauce.\nMix eggs through and serve hot." },
    { name: "Masala Chai", labels: ["Drinks", "Indian", "Quick"], cuisine: "Indian", cook: "8 min", emoji: "☕", plate: "greenrim", cookedCount: 5, portions: 2, ingredients: "1 cup water\n1 cup milk\n2 tsp tea leaves\n1/2 inch ginger\n2 cardamom\nSugar to taste", method: "Boil water with ginger and cardamom.\nAdd tea leaves and milk.\nSimmer, strain and serve." },
    { name: "Chole", labels: ["Indian", "Main", "Dinner"], cuisine: "Indian", cook: "45 min", emoji: "🥘", plate: "redpolka", cookedCount: 3, portions: 3, ingredients: "2 cup chickpeas\n1 onion\n2 tomato\n1 tbsp ginger garlic paste\n2 tsp chole masala\nCoriander garnish", method: "Cook onion and tomato masala.\nAdd chickpeas and spices.\nSimmer until thick." },
    { name: "Mango Sticky Rice", labels: ["Dessert"], cuisine: "Thai", cook: "25 min", emoji: "🥭", plate: "navystripe", cookedCount: 0, portions: 2, ingredients: "1 cup sticky rice\n1 cup coconut milk\n2 tbsp sugar\nSalt to taste\n1 mango", method: "Steam sticky rice.\nWarm coconut milk with sugar and salt.\nMix with rice and serve with mango." },
    { name: "Aloo Paratha", labels: ["Indian", "Breakfast"], cuisine: "Indian", cook: "20 min", emoji: "🫓", plate: "peach", cookedCount: 4, portions: 4, ingredients: "2 cup wheat flour\n3 potato\n1 tsp cumin\nCoriander garnish\n1 green chilli\nGhee as required", method: "Prepare dough and potato filling.\nRoll, fill and cook on tawa with ghee." },
  ];
  for (const demo of demos) {
    const ingredientsList = normaliseIngredients(demo.ingredientsList || lineArray(demo.ingredients).map(parseIngredientLine));
    const methodSteps = demo.methodSteps || lineArray(demo.method);
    await putItem("recipes", {
      id: uid(), photo: "", favorite: demo.cookedCount > 2, createdAt: now, updatedAt: now, lastCooked: "", notes: "",
      shape: "circle", prep: "", ...demo,
      portions: normalisePortions(demo.portions || 2),
      ingredientsList,
      methodSteps,
      ingredients: ingredientsList.map(formatIngredient).join("\n"),
      method: methodSteps.join("\n"),
    });
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
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.05" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h7"/><path d="M15 6h5"/><circle cx="13" cy="6" r="2"/><path d="M4 12h3"/><path d="M11 12h9"/><circle cx="9" cy="12" r="2"/><path d="M4 18h10"/><path d="M18 18h2"/><circle cx="16" cy="18" r="2"/></svg>',
    search: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18 9 12l6-6"/></svg>',
    close: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    check: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m5 13 4 4L19 7"/></svg>',
    camera: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z"/><circle cx="12" cy="13" r="4"/></svg>',
    sort: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v14"/><path d="m4 15 3 3 3-3"/><path d="M17 20V6"/><path d="m14 9 3-3 3 3"/></svg>',
    plate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M4 12h.01M20 12h.01"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3 5 6v5c0 5 3.2 8.5 7 10 3.8-1.5 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 4h14"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h6"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m6 6 1 15h10l1-15"/><path d="M10 11v6M14 11v6"/></svg>',
    edit: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>',
  };
  return icons[name] || "";
}

function lineArray(text) {
  return String(text || "").split(/\n+/).map(x => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
}

function normaliseUnit(unit) {
  const u = String(unit || "").trim().toLowerCase();
  const map = { l: "L", cups: "cup", pieces: "piece", cloves: "clove", packets: "packet", cans: "can", teaspoons: "tsp", tablespoon: "tbsp", tablespoons: "tbsp" };
  return map[u] || u;
}

function titleCase(value) {
  return String(value || "").trim().replace(/\s+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function unicodeFractionsToText(value) {
  return String(value || "")
    .replace(/¼/g, "1/4").replace(/½/g, "1/2").replace(/¾/g, "3/4")
    .replace(/⅓/g, "1/3").replace(/⅔/g, "2/3")
    .replace(/⅛/g, "1/8").replace(/⅜/g, "3/8").replace(/⅝/g, "5/8").replace(/⅞/g, "7/8");
}

function parseAmountNumber(value) {
  const text = unicodeFractionsToText(value).trim();
  if (!text) return null;
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text);
  const mixed = text.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = text.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return null;
}

function gcd(a, b) {
  while (b) [a, b] = [b, a % b];
  return Math.abs(a || 1);
}

function formatAmountNumber(value, unit = "") {
  if (!Number.isFinite(value)) return "";
  const lowerUnit = String(unit || "").toLowerCase();
  if (["g", "ml"].includes(lowerUnit)) return String(Math.round(value));
  if (["kg", "l"].includes(lowerUnit)) {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.0+$/, "");
  }
  const whole = Math.floor(value + 1e-9);
  const decimal = value - whole;
  const denominator = 8;
  let numerator = Math.round(decimal * denominator);
  if (numerator === 0) return String(whole);
  if (numerator === denominator) return String(whole + 1);
  const divisor = gcd(numerator, denominator);
  numerator /= divisor;
  const den = denominator / divisor;
  return whole > 0 ? `${whole} ${numerator}/${den}` : `${numerator}/${den}`;
}

function normalisePortions(value) {
  const n = Math.max(1, Math.min(99, Math.round(Number(value) || 2)));
  return n;
}

function shouldScale(item) {
  if (item.scalable === false) return false;
  if (!String(item.amount || "").trim()) return false;
  if (String(item.unit || "").toLowerCase() === "to taste") return false;
  if (/to taste|as required|garnish/i.test(`${item.amount || ""} ${item.unit || ""} ${item.note || ""}`)) return false;
  return parseAmountNumber(item.amount) !== null;
}

function shouldShowNotScaled(item) {
  if (item.scalable !== false) return false;
  const text = `${item.amount || ""} ${item.unit || ""} ${item.note || ""}`.trim();
  return Boolean(text && (/to taste|as required|garnish|optional/i.test(text) || parseAmountNumber(item.amount) !== null));
}

function scaleIngredient(item, factor = 1) {
  const base = { ...item };
  if (!shouldScale(base) || factor === 1) return base;
  const amount = parseAmountNumber(base.amount);
  base.amount = formatAmountNumber(amount * factor, base.unit);
  return base;
}

function parseIngredientLine(line) {
  const clean = unicodeFractionsToText(String(line || "").replace(/^[-•*\d.)\s]+/, "").trim());
  if (!clean) return { amount: "", unit: "", name: "", note: "", scalable: true };
  if (/^salt\s+to\s+taste$/i.test(clean)) return { amount: "", unit: "to taste", name: "Salt", note: "", scalable: false };
  const unitsPattern = "g|kg|ml|l|L|tsp|tbsp|cup|cups|piece|pieces|pinch|clove|cloves|inch|bunch|packet|packets|can|cans";
  const amountPattern = "(?:\\d+(?:\\.\\d+)?(?:\\s+\\d+\\s*\\/\\s*\\d+)?|\\d+\\s*\\/\\s*\\d+)";
  const match = clean.match(new RegExp(`^(${amountPattern})?\\s*(${unitsPattern})?\\s+(.+)$`, "i"));
  if (match && (match[1] || match[2])) {
    const amount = (match[1] || "").replace(/\s*\/\s*/g, "/").trim();
    const unit = normaliseUnit(match[2] || "");
    const rest = match[3].trim();
    const noteMatch = rest.match(/^(.+?)(?:,\s*|\s+-\s+|\s+\()(.+?)\)?$/);
    const item = { amount, unit, name: titleCase((noteMatch ? noteMatch[1] : rest).trim()), note: noteMatch ? noteMatch[2].trim() : "", scalable: true };
    item.scalable = shouldScale(item);
    return item;
  }
  const toTaste = clean.match(/^(.+?)\s+(to taste|as required)$/i);
  if (toTaste) return { amount: "", unit: toTaste[2].toLowerCase(), name: titleCase(toTaste[1]), note: "", scalable: false };
  return { amount: "", unit: "", name: titleCase(clean), note: "", scalable: false };
}

function normaliseIngredients(items) {
  return (items || [])
    .map(item => ({
      amount: unicodeFractionsToText(item.amount || "").trim(),
      unit: normaliseUnit(item.unit || ""),
      name: titleCase(item.name || ""),
      note: item.note || "",
      scalable: item.scalable === false ? false : shouldScale({ ...item, scalable: item.scalable }),
    }))
    .filter(item => item.name);
}

function getRecipeIngredients(recipe) {
  if (Array.isArray(recipe?.ingredientsList) && recipe.ingredientsList.length) return normaliseIngredients(recipe.ingredientsList);
  return normaliseIngredients(lineArray(recipe?.ingredients).map(parseIngredientLine));
}

function getRecipeSteps(recipe) {
  if (Array.isArray(recipe?.methodSteps) && recipe.methodSteps.length) return recipe.methodSteps.filter(Boolean);
  return lineArray(recipe?.method);
}

function formatIngredient(item) {
  const amount = String(item.amount || "").trim();
  const unit = String(item.unit || "").trim();
  const name = String(item.name || "").trim();
  const note = String(item.note || "").trim();
  if (!name) return "";
  if (unit === "to taste" && !amount) return `${name} to taste`;
  const qty = [amount, unit].filter(Boolean).join(" ");
  return `${qty ? `${qty} ` : ""}${name}${note ? `, ${note}` : ""}`.trim();
}

function formatScaledIngredient(item, factor) {
  return formatIngredient(scaleIngredient(item, factor));
}

function ingredientSuggestions(query = "") {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const used = [];
  state.recipes.forEach(recipe => getRecipeIngredients(recipe).forEach(item => item.name && used.push(item.name)));
  const all = [...new Set([...COMMON_INGREDIENTS, ...used].map(titleCase))];
  return all
    .filter(name => name.toLowerCase().includes(q))
    .sort((a, b) => {
      const as = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bs = b.toLowerCase().startsWith(q) ? 0 : 1;
      return as - bs || a.localeCompare(b);
    })
    .slice(0, 7);
}

function plateHtml(recipe, size = "tile") {
  const plate = recipe.plate || "checker";
  const fallback = recipe.emoji ? h(recipe.emoji) : h(initials(recipe.name));
  const photo = safePhoto(recipe.photo);
  return `
    <div class="plate ${size} plate-${h(plate)}" aria-hidden="true">
      <div class="dish-img shape-circle ${photo ? "has-photo" : ""}" ${photoStyle(photo)}>${fallback}</div>
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

function searchableRecipeText(recipe) {
  return [
    recipe.name,
    recipe.cuisine,
    (recipe.labels || []).join(" "),
    getRecipeIngredients(recipe).map(formatIngredient).join(" "),
    getRecipeSteps(recipe).join(" "),
    recipe.notes
  ].join(" ").toLowerCase();
}

function filteredRecipes() {
  const query = state.query.trim().toLowerCase();
  let recipes = [...state.recipes];
  if (state.activeLabel === "Favourites") recipes = recipes.filter(r => r.favorite);
  else if (state.activeLabel !== "All") recipes = recipes.filter(r => (r.labels || []).includes(state.activeLabel));
  if (query) recipes = recipes.filter(r => searchableRecipeText(r).includes(query));
  if (state.sort === "name") recipes.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  else if (state.sort === "cooked") recipes.sort((a, b) => (Number(b.cookedCount) || 0) - (Number(a.cookedCount) || 0) || String(a.name).localeCompare(String(b.name)));
  else if (state.sort === "favourite") recipes.sort((a, b) => Number(b.favorite) - Number(a.favorite) || String(a.name).localeCompare(String(b.name)));
  else if (state.sort === "cuisine") recipes.sort((a, b) => String(a.cuisine || "zzz").localeCompare(String(b.cuisine || "zzz")) || String(a.name).localeCompare(String(b.name)));
  else recipes.sort((a, b) => String(b.lastCooked || b.updatedAt || b.createdAt).localeCompare(String(a.lastCooked || a.updatedAt || a.createdAt)));
  return recipes;
}

function emptyPlateIcon() {
  return `<div class="empty-plate" aria-hidden="true"><span>${icon("plate")}</span></div>`;
}

function recipeSubtitle(recipe) {
  const parts = [recipe.cuisine, (recipe.labels || [])[0]].filter(Boolean);
  return parts.slice(0, 2).join(" · ") || "Recipe";
}

function cookedText(count) {
  const n = Number(count) || 0;
  return n ? `Cooked ${n}x` : "";
}

function sortLabel() {
  const map = { recent: "Newest", name: "A-Z", cooked: "Most cooked", favourite: "Favourites", cuisine: "Cuisine" };
  return map[state.sort] || "Newest";
}

function sortMenuHtml() {
  if (!state.sortOpen) return "";
  const options = [
    ["recent", "Newest first"],
    ["name", "A-Z"],
    ["cooked", "Most cooked"],
    ["favourite", "Favourites first"],
    ["cuisine", "Cuisine"],
  ];
  return `<div class="sort-menu" role="menu">${options.map(([value, label]) => `<button class="sort-option ${state.sort === value ? "active" : ""}" data-action="set-sort" data-sort="${value}"><span>${h(label)}</span>${state.sort === value ? icon("check") : ""}</button>`).join("")}</div>`;
}

function recentCookedHtml() {
  const recent = [...state.recipes]
    .filter(r => Number(r.cookedCount) > 0)
    .sort((a, b) => String(b.lastCooked || b.updatedAt || b.createdAt).localeCompare(String(a.lastCooked || a.updatedAt || a.createdAt)))
    .slice(0, 5);
  if (!recent.length || state.query || state.activeLabel !== "All") return "";
  return `<div class="quick-section"><div class="quick-head"><b>Recently cooked</b><small>${recent.length} quick pick${recent.length === 1 ? "" : "s"}</small></div><div class="quick-scroll">${recent.map(recipe => `<button class="quick-chip" data-action="open" data-id="${h(recipe.id)}">${plateHtml(recipe, "mini")}<span>${h(recipe.name)}</span></button>`).join("")}</div></div>`;
}

function recipesGridHtml() {
  const recipes = filteredRecipes();
  if (!recipes.length) {
    const hasRecipes = state.recipes.length > 0;
    const title = hasRecipes ? "No matching recipes" : "No recipes yet";
    const message = hasRecipes ? "Try another search or clear the filter." : "Add your first dish to start building your menu.";
    return `<div class="empty empty-home" style="grid-column:1/-1">${emptyPlateIcon()}<b>${title}</b><span>${message}</span>${hasRecipes ? `<button class="btn compact" data-action="clear-search">Clear filters</button>` : `<button class="btn compact primary" data-action="new">+ Add dish</button>`}</div>`;
  }
  return recipes.map(recipe => `
    <button class="recipe-tile" data-action="open" data-id="${h(recipe.id)}" aria-label="Open ${h(recipe.name)}">
      ${recipe.favorite ? '<span class="favorite-dot">★</span>' : ""}
      ${plateHtml(recipe, "tile")}
      <div class="tile-name">${h(recipe.name)}</div>
      <div class="tile-meta">${h(cookedText(recipe.cookedCount) || recipeSubtitle(recipe))}</div>
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
      <button class="nav-item ${active === "settings" ? "active" : ""}" data-action="nav" data-view="settings">${icon("settings")}<span>Settings</span></button>
    </nav>
  `;
}

function renderHome() {
  const labels = ["All", "Favourites", ...allLabels()].filter((v, i, arr) => arr.indexOf(v) === i && (v === "All" || v === "Favourites" || labelCount(v) > 0));
  const recipeCount = state.recipes.length;
  app.innerHTML = `
    <section class="app-shell home-shell">
      <div class="top-row compact-top">
        <div>
          <h1>My menu</h1>
          <p class="subtitle">${recipeCount ? `${recipeCount} recipe${recipeCount === 1 ? "" : "s"} saved` : "Start your visual cookbook"}</p>
        </div>
        <div class="sort-wrap">
          <button class="icon-btn sort-btn" data-action="sort" aria-label="Change sort order" title="Sort recipes">${icon("sort")}</button>
          ${sortMenuHtml()}
        </div>
      </div>
      <div class="search-wrap">
        ${icon("search")}
        <input id="searchInput" type="search" placeholder="Search dishes or ingredients" value="${h(state.query)}" autocomplete="off" />
      </div>
      <div class="chips compact-chips" aria-label="Recipe categories">
        ${labels.map(label => `<button class="chip ${state.activeLabel === label ? "active" : ""}" data-action="filter" data-label="${h(label)}">${h(label)} (${labelCount(label)})</button>`).join("")}
      </div>
      ${recentCookedHtml()}
      <div class="section-label-row"><b>${state.activeLabel === "All" ? "All recipes" : h(state.activeLabel)}</b><small>Sorted by ${h(sortLabel())}</small></div>
      <div id="recipeGrid" class="recipe-grid">${recipesGridHtml()}</div>
      ${navHtml("home")}
    </section>
  `;
  document.getElementById("searchInput").addEventListener("input", event => {
    state.query = event.target.value;
    document.getElementById("recipeGrid").innerHTML = recipesGridHtml();
  });
}

function getBasePortions(recipe) {
  return normalisePortions(recipe.portions || recipe.serves || 2);
}

function getDisplayPortions(recipe) {
  return normalisePortions(state.portionView[recipe.id] || getBasePortions(recipe));
}

function portionFactor(recipe) {
  return getDisplayPortions(recipe) / getBasePortions(recipe);
}

function detailHtml(recipe) {
  const labels = (recipe.labels || []).join(" · ");
  const ingredients = getRecipeIngredients(recipe);
  const method = getRecipeSteps(recipe);
  const portions = getDisplayPortions(recipe);
  const basePortions = getBasePortions(recipe);
  const factor = portionFactor(recipe);
  return `
    <section class="app-shell">
      <div class="toolbar">
        <button class="icon-btn" data-action="back-home" aria-label="Back">${icon("back")}</button>
        <div class="toolbar-title">Recipe</div>
        <button class="icon-btn fav-btn" data-action="toggle-fav" data-id="${h(recipe.id)}" aria-label="Toggle favourite">${recipe.favorite ? "★" : "☆"}</button>
      </div>
      <div class="recipe-hero-compact">
        ${plateHtml(recipe, "hero")}
        <h2 class="hero-title">${h(recipe.name)}</h2>
        <div class="hero-meta">${h([labels || recipe.cuisine || "Recipe", recipe.cook ? `Cook ${recipe.cook}` : ""].filter(Boolean).join(" · "))}</div>
      </div>
      <div class="portion-card">
        <div>
          <b>${h(portions)} portion${portions === 1 ? "" : "s"}</b>
          <small>Original recipe makes ${h(basePortions)}</small>
        </div>
        <div class="portion-controls">
          <button data-action="portion-minus" data-id="${h(recipe.id)}" aria-label="Decrease portions">−</button>
          <output>${h(portions)}</output>
          <button data-action="portion-plus" data-id="${h(recipe.id)}" aria-label="Increase portions">+</button>
        </div>
        <button class="mini-link reset-portion" data-action="portion-reset" data-id="${h(recipe.id)}" ${portions === basePortions ? "disabled" : ""}>Reset</button>
      </div>
      <div class="card">
        <div class="section-head">
          <div class="section-title" style="margin:0">Ingredients</div>
          <button class="chip accent" data-action="add-shopping" data-id="${h(recipe.id)}">Add to list</button>
        </div>
        <div class="line-list" style="margin-top:13px">
          ${ingredients.length ? ingredients.map(item => `<label class="check-row"><input type="checkbox"><span>${h(formatScaledIngredient(item, factor))}${shouldScale(item) && factor !== 1 ? `<small class="scaled-note">from ${h(formatIngredient(item))}</small>` : ""}</span></label>`).join("") : '<p class="small-muted">No ingredients added yet.</p>'}
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
  return labels.map(label => `<button type="button" class="label-chip ${selectedLabels.includes(label) ? "active" : ""}" data-label-chip="${h(label)}">${h(label)}</button>`).join("") + `<button type="button" class="label-chip add-label" data-action="add-label">+</button>`;
}

function renderForm(id = null) {
  const recipe = id ? state.recipes.find(r => r.id === id) : null;
  const selectedLabels = recipe?.labels?.length ? recipe.labels : ["Main"];
  const plate = recipe?.plate || "checker";
  state.formPhoto = recipe?.photo || "";
  state.formIngredients = getRecipeIngredients(recipe || {});
  state.formSteps = getRecipeSteps(recipe || {});
  state.reorderIngredients = false;
  state.reorderSteps = false;
  const previewRecipe = { name: recipe?.name || "New Dish", emoji: recipe?.emoji || "🍽️", plate, photo: state.formPhoto };
  app.innerHTML = `
    <section class="app-shell form-shell">
      <div class="toolbar">
        <button class="icon-btn" data-action="cancel-form" aria-label="Cancel">${icon("close")}</button>
        <div class="toolbar-title">${recipe ? "Edit dish" : "Add a dish"}</div>
        <button class="icon-btn primary" data-action="save-form" aria-label="Save">${icon("check")}</button>
      </div>
      <form id="recipeForm" novalidate>
        <input type="hidden" id="recipeId" value="${h(recipe?.id || "")}" />
        <input type="hidden" id="plateValue" value="${h(plate)}" />
        <div class="photo-edit compact-photo">
          <div id="previewPlate">${plateHtml(previewRecipe, "preview")}</div>
          <label class="photo-pick" aria-label="Add photo">
            ${icon("camera")}
            <input id="photoInput" type="file" accept="image/*" hidden />
          </label>
        </div>
        <div class="form-section tight">
          <label for="nameInput">Dish name</label>
          <input id="nameInput" required maxlength="80" placeholder="Dish name (required)" value="${h(recipe?.name || "")}" />
        </div>
        <div class="form-section tight">
          <div class="field-label">Labels</div>
          <div id="labelWrap" class="label-wrap compact-labels">${formLabelsHtml(selectedLabels)}</div>
        </div>
        <div class="form-section details-grid">
          <div><label for="cuisineInput">Cuisine</label><input id="cuisineInput" placeholder="e.g. Indian" value="${h(recipe?.cuisine || "")}" /></div>
          <div><label for="cookInput">Cook time</label><input id="cookInput" placeholder="40 min" value="${h(recipe?.cook || "")}" /></div>
          <div><label for="portionInput">Portions</label><div class="mini-stepper"><button type="button" data-action="form-portion-minus">−</button><input id="portionInput" inputmode="numeric" value="${h(getBasePortions(recipe || { portions: 2 }))}" /><button type="button" data-action="form-portion-plus">+</button></div></div>
        </div>
        <div class="form-section">
          <div class="field-label">Plate backdrop</div>
          <div class="plate-row">
            ${PLATES.map(p => `<button type="button" class="plate-option ${plate === p.id ? "active" : ""}" title="${h(p.label)}" data-plate="${h(p.id)}"><span class="plate plate-${h(p.id)}"><span class="dish-img shape-circle" style="width:48%;height:48%;font-size:12px"> </span></span></button>`).join("")}
          </div>
        </div>

        <div class="builder-card" id="ingredientBuilder">
          <div class="builder-head compact-builder-head">
            <div class="section-title mini">Ingredients</div>
            <div class="builder-actions">
              <button type="button" class="mini-link" data-action="toggle-paste" data-target="ingredientPasteBox">Quick paste</button>
              <button type="button" id="ingredientReorderToggle" class="mini-link" data-action="toggle-ingredient-reorder">Reorder</button>
            </div>
          </div>
          <div id="ingredientPasteBox" class="paste-box hidden">
            <textarea id="ingredientPasteInput" placeholder="Paste ingredients, one per line&#10;500g chicken&#10;1/2 cup yoghurt&#10;Salt to taste"></textarea>
            <button type="button" class="btn full" data-action="import-ingredients">Add pasted ingredients</button>
          </div>
          <div class="ingredient-fields">
            <div class="ingredient-name-wrap">
              <label for="ingredientNameInput">Ingredient</label>
              <input id="ingredientNameInput" placeholder="Start typing, e.g. garlic" autocomplete="off" />
              <div id="ingredientSuggestions" class="suggestion-row"></div>
            </div>
            <div>
              <label for="ingredientAmountInput">Amount</label>
              <input id="ingredientAmountInput" placeholder="1/2" inputmode="decimal" />
            </div>
            <div>
              <label for="ingredientUnitInput">Unit</label>
              <select id="ingredientUnitInput">
                ${UNITS.map(unit => `<option value="${h(unit)}">${unit ? h(unit) : "—"}</option>`).join("")}
              </select>
            </div>
            <label class="scale-toggle"><input id="ingredientScaleInput" type="checkbox" checked /> <span>Scale</span></label>
            <div class="amount-pills">${AMOUNT_CHIPS.map(amount => `<button type="button" class="amount-chip" data-amount-chip="${h(amount)}">${h(amount)}</button>`).join("")}</div>
            <div class="ingredient-note-field">
              <label for="ingredientNoteInput">Note</label>
              <input id="ingredientNoteInput" placeholder="chopped, optional, garnish" />
            </div>
          </div>
          <button type="button" class="btn dark full" data-action="add-ingredient">+ Add ingredient</button>
          <div id="ingredientList" class="ingredient-list"></div>
        </div>

        <div class="builder-card">
          <div class="builder-head compact-builder-head">
            <div class="section-title mini">Method</div>
            <div class="builder-actions">
              <button type="button" class="mini-link" data-action="toggle-paste" data-target="methodPasteBox">Quick paste</button>
              <button type="button" id="stepReorderToggle" class="mini-link" data-action="toggle-step-reorder">Reorder</button>
            </div>
          </div>
          <div id="methodPasteBox" class="paste-box hidden">
            <textarea id="methodPasteInput" placeholder="Paste method steps, one per line"></textarea>
            <button type="button" class="btn full" data-action="import-steps">Add pasted steps</button>
          </div>
          <label for="methodStepInput">New step</label>
          <textarea id="methodStepInput" class="step-input" placeholder="e.g. Cook onion until golden brown"></textarea>
          <button type="button" class="btn dark full" data-action="add-step">+ Add step</button>
          <div id="stepList" class="step-list"></div>
        </div>

        <div class="form-section">
          <label for="notesInput">Notes</label>
          <textarea id="notesInput" placeholder="Optional changes, family preferences, reminders">${h(recipe?.notes || "")}</textarea>
        </div>
        <button class="btn primary full" type="button" data-action="save-form">Save recipe</button>
      </form>
    </section>
  `;
  attachFormEvents();
  renderIngredientList();
  renderStepList();
}

function updatePreview() {
  const name = document.getElementById("nameInput")?.value || "New Dish";
  const plate = document.getElementById("plateValue")?.value || "checker";
  const recipe = { name, emoji: "🍽️", plate, photo: state.formPhoto };
  const preview = document.getElementById("previewPlate");
  if (preview) preview.innerHTML = plateHtml(recipe, "preview");
}

function attachFormEvents() {
  document.getElementById("nameInput")?.addEventListener("input", updatePreview);
  document.getElementById("ingredientNameInput")?.addEventListener("input", renderIngredientSuggestions);
  ["ingredientNameInput", "ingredientAmountInput", "ingredientNoteInput"].forEach(id => {
    document.getElementById(id)?.addEventListener("keydown", event => {
      if (event.key === "Enter") { event.preventDefault(); addIngredientFromFields(); }
    });
  });
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

function renderIngredientSuggestions() {
  const input = document.getElementById("ingredientNameInput");
  const box = document.getElementById("ingredientSuggestions");
  if (!input || !box) return;
  const suggestions = ingredientSuggestions(input.value);
  box.innerHTML = suggestions.map(name => `<button type="button" class="suggestion-chip" data-ingredient-suggestion="${h(name)}">${h(name)}</button>`).join("");
}

function renderIngredientList() {
  const list = document.getElementById("ingredientList");
  if (!list) return;
  const toggle = document.getElementById("ingredientReorderToggle");
  if (toggle) {
    toggle.textContent = state.reorderIngredients ? "Done" : "Reorder";
    toggle.classList.toggle("active", state.reorderIngredients);
    toggle.disabled = state.formIngredients.length < 2;
  }
  list.classList.toggle("reorder-active", state.reorderIngredients);
  if (!state.formIngredients.length) {
    list.innerHTML = `<div class="empty-inline">No ingredients added yet.</div>`;
    return;
  }
  list.innerHTML = state.formIngredients.map((item, index) => {
    const notScaled = shouldShowNotScaled(item);
    if (state.reorderIngredients) {
      return `
        <div class="builder-row reorder-row" data-sort-type="ingredient" data-index="${index}">
          <button type="button" class="drag-handle" data-drag-handle="ingredient" data-index="${index}" aria-label="Drag ${h(item.name)}">☰</button>
          <div class="row-main reorder-main"><b>${h(formatIngredient(item))}</b>${notScaled ? `<small class="row-tag">Not scaled</small>` : ""}</div>
        </div>
      `;
    }
    return `
      <div class="builder-row clean-row">
        <button type="button" class="row-main" data-action="edit-ingredient" data-index="${index}">
          <b>${h(formatIngredient(item))}</b>
          ${notScaled ? `<small class="row-tag">Not scaled</small>` : ""}
        </button>
        <button type="button" class="row-delete" data-action="remove-ingredient" data-index="${index}" aria-label="Remove ${h(item.name)}">×</button>
      </div>
    `;
  }).join("");
  attachSortableRows("ingredientList", "ingredient");
}

function renderStepList() {
  const list = document.getElementById("stepList");
  if (!list) return;
  const toggle = document.getElementById("stepReorderToggle");
  if (toggle) {
    toggle.textContent = state.reorderSteps ? "Done" : "Reorder";
    toggle.classList.toggle("active", state.reorderSteps);
    toggle.disabled = state.formSteps.length < 2;
  }
  list.classList.toggle("reorder-active", state.reorderSteps);
  if (!state.formSteps.length) {
    list.innerHTML = `<div class="empty-inline">No method steps added yet.</div>`;
    return;
  }
  list.innerHTML = state.formSteps.map((step, index) => {
    if (state.reorderSteps) {
      return `
        <div class="builder-row reorder-row step-row" data-sort-type="step" data-index="${index}">
          <button type="button" class="drag-handle" data-drag-handle="step" data-index="${index}" aria-label="Drag step ${index + 1}">☰</button>
          <div class="row-main reorder-main"><span class="step-number">${index + 1}</span><b>${h(step)}</b></div>
        </div>
      `;
    }
    return `
      <div class="builder-row clean-row step-row">
        <button type="button" class="row-main" data-action="edit-step" data-index="${index}">
          <span class="step-number">${index + 1}</span>
          <b>${h(step)}</b>
        </button>
        <button type="button" class="row-delete" data-action="remove-step" data-index="${index}" aria-label="Remove step ${index + 1}">×</button>
      </div>
    `;
  }).join("");
  attachSortableRows("stepList", "step");
}

function attachSortableRows(listId, type) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.querySelectorAll(`[data-drag-handle="${type}"]`).forEach(handle => {
    handle.addEventListener("pointerdown", event => startSortDrag(event, type));
  });
}

function startSortDrag(event, type) {
  const handle = event.currentTarget;
  const fromIndex = Number(handle.dataset.index);
  const list = handle.closest(".ingredient-list, .step-list");
  if (!list || !Number.isFinite(fromIndex)) return;
  event.preventDefault();
  handle.setPointerCapture?.(event.pointerId);
  document.body.classList.add("sorting");
  const startRow = handle.closest("[data-sort-type]");
  startRow?.classList.add("dragging");
  let overIndex = fromIndex;

  const clearOver = () => list.querySelectorAll(".drag-over").forEach(row => row.classList.remove("drag-over"));
  const onMove = moveEvent => {
    const el = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest(`[data-sort-type="${type}"]`);
    if (!el || !list.contains(el)) return;
    clearOver();
    el.classList.add("drag-over");
    overIndex = Number(el.dataset.index);
  };
  const onEnd = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onEnd);
    document.removeEventListener("pointercancel", onEnd);
    document.body.classList.remove("sorting");
    clearOver();
    const array = type === "ingredient" ? state.formIngredients : state.formSteps;
    moveItemInArray(array, fromIndex, overIndex);
    if (type === "ingredient") renderIngredientList();
    else renderStepList();
  };
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onEnd, { once: true });
  document.addEventListener("pointercancel", onEnd, { once: true });
}

function addIngredientFromFields() {
  const nameInput = document.getElementById("ingredientNameInput");
  const amountInput = document.getElementById("ingredientAmountInput");
  const unitInput = document.getElementById("ingredientUnitInput");
  const noteInput = document.getElementById("ingredientNoteInput");
  const scaleInput = document.getElementById("ingredientScaleInput");
  const item = {
    amount: unicodeFractionsToText(amountInput.value.trim()),
    unit: unitInput.value.trim(),
    name: titleCase(nameInput.value.trim()),
    note: noteInput.value.trim(),
    scalable: Boolean(scaleInput.checked),
  };
  if (!item.name) {
    toast("Ingredient name is required");
    nameInput.focus();
    return false;
  }
  if (!shouldScale(item)) item.scalable = false;
  const duplicateIndex = state.formIngredients.findIndex(x => x.name.toLowerCase() === item.name.toLowerCase());
  if (duplicateIndex >= 0) {
    const ok = confirm(`${item.name} is already added. Replace the existing ingredient?`);
    if (!ok) return false;
    state.formIngredients[duplicateIndex] = item;
  } else {
    state.formIngredients.push(item);
  }
  nameInput.value = "";
  amountInput.value = "";
  unitInput.value = "";
  noteInput.value = "";
  scaleInput.checked = true;
  renderIngredientSuggestions();
  renderIngredientList();
  nameInput.focus();
  return true;
}

function addStepFromField() {
  const input = document.getElementById("methodStepInput");
  const step = input.value.trim();
  if (!step) {
    toast("Step text is required");
    input.focus();
    return false;
  }
  state.formSteps.push(step);
  input.value = "";
  renderStepList();
  input.focus();
  return true;
}

function moveItemInArray(array, fromIndex, toIndex) {
  if (!Array.isArray(array)) return;
  const from = Number(fromIndex);
  const to = Number(toIndex);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) return;
  if (from < 0 || from >= array.length || to < 0 || to >= array.length) return;
  const [item] = array.splice(from, 1);
  array.splice(to, 0, item);
}

function importPastedIngredients() {
  const input = document.getElementById("ingredientPasteInput");
  const items = normaliseIngredients(lineArray(input.value).map(parseIngredientLine));
  if (!items.length) return toast("Paste at least one ingredient");
  for (const item of items) {
    const existing = state.formIngredients.findIndex(x => x.name.toLowerCase() === item.name.toLowerCase());
    if (existing >= 0) state.formIngredients[existing] = item;
    else state.formIngredients.push(item);
  }
  input.value = "";
  renderIngredientList();
  toast(`${items.length} ingredient${items.length === 1 ? "" : "s"} added`);
}

function importPastedSteps() {
  const input = document.getElementById("methodPasteInput");
  const steps = lineArray(input.value);
  if (!steps.length) return toast("Paste at least one step");
  state.formSteps.push(...steps);
  input.value = "";
  renderStepList();
  toast(`${steps.length} step${steps.length === 1 ? "" : "s"} added`);
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
  const ingredientDraft = document.getElementById("ingredientNameInput")?.value.trim();
  if (ingredientDraft) addIngredientFromFields();
  const stepDraft = document.getElementById("methodStepInput")?.value.trim();
  if (stepDraft) addStepFromField();
  const labels = [...document.querySelectorAll("[data-label-chip].active")].map(btn => btn.dataset.labelChip).filter(Boolean);
  const now = new Date().toISOString();
  const ingredientsList = normaliseIngredients(state.formIngredients);
  const methodSteps = state.formSteps.filter(Boolean);
  const recipe = {
    id,
    name,
    labels: labels.length ? labels : ["Main"],
    cuisine: document.getElementById("cuisineInput").value.trim(),
    prep: "",
    cook: document.getElementById("cookInput").value.trim(),
    portions: normalisePortions(document.getElementById("portionInput").value),
    serves: "",
    ingredientsList,
    methodSteps,
    ingredients: ingredientsList.map(formatIngredient).filter(Boolean).join("\n"),
    method: methodSteps.join("\n"),
    notes: document.getElementById("notesInput").value.trim(),
    shape: "circle",
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
  state.portionView[id] = recipe.portions;
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

function renderSettings() {
  app.innerHTML = `
    <section class="app-shell">
      <div class="toolbar">
        <button class="icon-btn" data-action="back-home" aria-label="Back">${icon("back")}</button>
        <div class="toolbar-title">Settings</div>
        <button class="icon-btn" data-action="new" aria-label="Add recipe">+</button>
      </div>
      <h3 class="section-title">Appearance</h3>
      <div class="setting-block">
        <div class="setting-block-head"><b>Display density</b><small>Choose how much space the recipe grid uses.</small></div>
        <div class="segmented-control">
          <button class="${(state.settings.density || "comfortable") === "comfortable" ? "active" : ""}" data-action="set-density" data-density="comfortable">Comfortable</button>
          <button class="${state.settings.density === "compact" ? "active" : ""}" data-action="set-density" data-density="compact">Compact</button>
        </div>
      </div>
      <div class="theme-grid">
        ${THEMES.map(theme => `<button class="theme-card ${state.settings.theme === theme.id ? "active" : ""}" data-action="set-theme" data-theme="${h(theme.id)}"><span class="theme-swatch theme-${h(theme.id)}"></span><b>${h(theme.name)}</b><small>${h(theme.note)}</small></button>`).join("")}
      </div>
      <div class="backup-hero compact-settings-hero">
        <div class="shield-icon">${icon("shield")}</div>
        <h2 style="margin:0 0 8px">Your recipes are local</h2>
        <p class="small-muted" style="margin:0">Recipes and photos are stored on this iPhone/iPad browser. Export a backup regularly, especially before clearing Safari website data.</p>
      </div>
      <h3 class="section-title">Backup & restore</h3>
      <button class="settings-row" data-action="export-full"><span class="settings-icon">${icon("download")}</span><span><b>Export full backup</b><small>Includes recipes, photos and shopping list</small></span><span>›</span></button>
      <button class="settings-row" data-action="export-text"><span class="settings-icon">${icon("file")}</span><span><b>Export recipe text only</b><small>Smaller JSON file without photos</small></span><span>›</span></button>
      <button class="settings-row" data-action="import-backup"><span class="settings-icon">${icon("upload")}</span><span><b>Import backup</b><small>Restore from a JSON backup file</small></span><span>›</span></button>
      <h3 class="section-title">Data</h3>
      <button class="settings-row" data-action="clear-recipes"><span class="settings-icon warning">${icon("trash")}</span><span><b>Clear all recipes</b><small class="warning">This cannot be undone unless you have a backup</small></span><span>›</span></button>
      ${navHtml("settings")}
    </section>
  `;
}

function render() {
  if (state.view === "shopping") return renderShopping();
  if (state.view === "settings") return renderSettings();
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
  const factor = portionFactor(recipe);
  const ingredients = getRecipeIngredients(recipe).map(item => formatScaledIngredient(item, factor)).filter(Boolean);
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
    version: 6,
    exportedAt: new Date().toISOString(),
    includesPhotos: includePhotos,
    settings: state.settings,
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
  if (data.settings) {
    if (data.settings.theme) state.settings.theme = THEMES.some(t => t.id === data.settings.theme) ? data.settings.theme : state.settings.theme;
    if (["comfortable", "compact"].includes(data.settings.density)) state.settings.density = data.settings.density;
    saveSettings();
  }
  for (const recipe of data.recipes) {
    if (!recipe.name) continue;
    const ingredientsList = getRecipeIngredients(recipe);
    const methodSteps = getRecipeSteps(recipe);
    await putItem("recipes", {
      ...recipe,
      id: recipe.id || uid(),
      shape: "circle",
      prep: "",
      portions: normalisePortions(recipe.portions || recipe.serves || 2),
      serves: "",
      ingredientsList,
      methodSteps,
      ingredients: ingredientsList.map(formatIngredient).filter(Boolean).join("\n"),
      method: methodSteps.join("\n"),
      updatedAt: recipe.updatedAt || new Date().toISOString()
    });
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
  const target = event.target.closest("[data-action], [data-plate], [data-label-chip], [data-ingredient-suggestion], [data-amount-chip]");
  if (!target) return;

  if (target.dataset.labelChip) {
    target.classList.toggle("active");
    return;
  }
  if (target.dataset.ingredientSuggestion) {
    const input = document.getElementById("ingredientNameInput");
    input.value = target.dataset.ingredientSuggestion;
    document.getElementById("ingredientSuggestions").innerHTML = "";
    input.focus();
    return;
  }
  if (target.dataset.amountChip) {
    document.getElementById("ingredientAmountInput").value = target.dataset.amountChip;
    document.getElementById("ingredientUnitInput").focus();
    return;
  }
  if (target.dataset.plate) {
    document.getElementById("plateValue").value = target.dataset.plate;
    document.querySelectorAll("[data-plate]").forEach(btn => btn.classList.toggle("active", btn === target));
    updatePreview();
    return;
  }

  const { action, id, view, label, tab, index, dir, target: targetId, theme } = target.dataset;
  if (action === "open") { state.view = "detail"; renderDetail(id); }
  if (action === "back-home") { state.view = "home"; renderHome(); }
  if (action === "nav") { state.view = view; if (view === "home") state.activeLabel = "All"; render(); }
  if (action === "favourites") { state.view = "home"; state.activeLabel = "Favourites"; renderHome(); }
  if (action === "new") { state.view = "form"; renderForm(); }
  if (action === "edit") { state.view = "form"; renderForm(id); }
  if (action === "cancel-form") { state.view = "home"; renderHome(); }
  if (action === "save-form") await saveForm();
  if (action === "filter") { state.activeLabel = label; state.sortOpen = false; renderHome(); }
  if (action === "clear-search") { state.query = ""; state.activeLabel = "All"; state.sortOpen = false; renderHome(); }
  if (action === "sort") { state.sortOpen = !state.sortOpen; renderHome(); }
  if (action === "set-sort") { state.sort = target.dataset.sort || "recent"; state.sortOpen = false; renderHome(); }
  if (action === "toggle-fav") { await toggleFavourite(id); renderDetail(id); }
  if (action === "mark-cooked") await markCooked(id);
  if (action === "add-shopping") await addRecipeIngredientsToShopping(id);
  if (action === "portion-minus") { const r = state.recipes.find(x => x.id === id); state.portionView[id] = Math.max(1, getDisplayPortions(r) - 1); renderDetail(id); }
  if (action === "portion-plus") { const r = state.recipes.find(x => x.id === id); state.portionView[id] = Math.min(99, getDisplayPortions(r) + 1); renderDetail(id); }
  if (action === "portion-reset") { const r = state.recipes.find(x => x.id === id); state.portionView[id] = getBasePortions(r); renderDetail(id); }
  if (action === "form-portion-minus") { const input = document.getElementById("portionInput"); input.value = Math.max(1, normalisePortions(input.value) - 1); }
  if (action === "form-portion-plus") { const input = document.getElementById("portionInput"); input.value = Math.min(99, normalisePortions(input.value) + 1); }
  if (action === "delete-recipe") {
    if (confirm("Delete this recipe?")) {
      await deleteItem("recipes", id);
      state.recipes = await getAll("recipes");
      toast("Recipe deleted");
      state.view = "home";
      renderHome();
    }
  }
  if (action === "add-label") {
    const labelName = prompt("New label name");
    if (!labelName?.trim()) return;
    const wrap = document.getElementById("labelWrap");
    const label = labelName.trim();
    const exists = [...wrap.querySelectorAll("[data-label-chip]")].some(btn => btn.dataset.labelChip.toLowerCase() === label.toLowerCase());
    if (!exists) target.insertAdjacentHTML("beforebegin", `<button type="button" class="label-chip active" data-label-chip="${h(label)}">${h(label)}</button>`);
  }
  if (action === "toggle-paste") document.getElementById(targetId)?.classList.toggle("hidden");
  if (action === "add-ingredient") addIngredientFromFields();
  if (action === "toggle-ingredient-reorder") { state.reorderIngredients = !state.reorderIngredients; renderIngredientList(); }
  if (action === "remove-ingredient") { state.formIngredients.splice(Number(index), 1); renderIngredientList(); }
  if (action === "edit-ingredient") {
    const item = state.formIngredients.splice(Number(index), 1)[0];
    document.getElementById("ingredientNameInput").value = item.name || "";
    document.getElementById("ingredientAmountInput").value = item.amount || "";
    document.getElementById("ingredientUnitInput").value = item.unit || "";
    document.getElementById("ingredientNoteInput").value = item.note || "";
    document.getElementById("ingredientScaleInput").checked = item.scalable !== false;
    renderIngredientList();
    document.getElementById("ingredientNameInput").focus();
  }
  if (action === "import-ingredients") importPastedIngredients();
  if (action === "add-step") addStepFromField();
  if (action === "toggle-step-reorder") { state.reorderSteps = !state.reorderSteps; renderStepList(); }
  if (action === "remove-step") { state.formSteps.splice(Number(index), 1); renderStepList(); }
  if (action === "edit-step") {
    const step = state.formSteps.splice(Number(index), 1)[0];
    document.getElementById("methodStepInput").value = step;
    renderStepList();
    document.getElementById("methodStepInput").focus();
  }
  if (action === "import-steps") importPastedSteps();
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
  if (action === "set-theme") {
    state.settings.theme = theme;
    saveSettings();
    renderSettings();
    toast("Theme updated");
  }
  if (action === "set-density") {
    state.settings.density = target.dataset.density === "compact" ? "compact" : "comfortable";
    saveSettings();
    renderSettings();
    toast("Display updated");
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
    applyTheme();
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
