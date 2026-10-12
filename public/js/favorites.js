// ИЗБРАННОЕ: ПОКАЗЫВАЕМ ТОЛЬКО СОХРАНЁННЫЕ ОБЪЯВЛЕНИЯ
'use strict';
let favoriteProperties = [];

function displayFavorites() {
  const selected = [];
  for (const property of favoriteProperties) {
    if (app.favoriteIds.includes(property.id)) selected.push(property);
  }
  displayProperties(selected, document.getElementById('favorites-list'));
}

async function initializeFavorites() {
  await siteReady;
  if (!requireLogin()) return;
  const result = await request('properties');
  favoriteProperties = result.items;
  displayFavorites();
  document.addEventListener('favorites-changed', displayFavorites);
}
initializeFavorites().catch(function (error) { showNotice(error.message); });
