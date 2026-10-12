// КАТАЛОГ: ЗАГРУЗКА, ПОИСК, ФИЛЬТРЫ, СОРТИРОВКА
'use strict';
let allProperties = [];
let selectedDeal = 'all';

function filterProperties() {
  const city = document.getElementById('city').value;
  const type = document.getElementById('type').value;
  const priceInput = document.getElementById('max-price');
  const query = document.getElementById('query').value.trim().toLowerCase();
  const sort = document.getElementById('sort').value;
  let maxPrice = Infinity;
  if (priceInput.value !== '') maxPrice = Number(priceInput.value);

  const results = [];
  // Обычный цикл: проверяем каждое объявление по всем фильтрам.
  for (const property of allProperties) {
    if (selectedDeal !== 'all' && property.deal !== selectedDeal) continue;
    if (city !== '' && property.city !== city) continue;
    if (type !== '' && property.type !== type) continue;
    if (property.price > maxPrice) continue;

    const text = (property.title + ' ' + property.city + ' ' + property.address).toLowerCase();
    if (!text.includes(query)) continue;
    results.push(property);
  }

  if (sort === 'asc') {
    results.sort(function (a, b) { return a.price - b.price; });
  } else if (sort === 'desc') {
    results.sort(function (a, b) { return b.price - a.price; });
  }

  document.getElementById('result-count').textContent = 'Найдено: ' + results.length + ' · Демонстрационные объявления';
  displayProperties(results, document.getElementById('results'));
}

async function initializeCatalog() {
  await siteReady;
  const result = await request('properties');
  allProperties = result.items;

  const form = document.getElementById('search-form');
  form.addEventListener('submit', function (event) {
    event.preventDefault(); // Не перезагружаем страницу после отправки формы.
    if (form.reportValidity()) filterProperties();
  });

  const dealButtons = document.querySelectorAll('[data-deal]');
  for (const button of dealButtons) {
    button.addEventListener('click', function () {
      selectedDeal = button.dataset.deal;
      for (const otherButton of dealButtons) {
        const active = otherButton === button;
        otherButton.classList.toggle('active', active);
        otherButton.setAttribute('aria-pressed', String(active));
      }
      filterProperties();
    });
  }

  for (const id of ['city', 'type', 'sort']) {
    document.getElementById(id).addEventListener('change', filterProperties);
  }
  document.getElementById('query').addEventListener('input', filterProperties);
  document.getElementById('max-price').addEventListener('input', function () {
    if (this.validity.valid) filterProperties();
  });
  document.getElementById('reset').addEventListener('click', function () {
    form.reset();
    document.getElementById('sort').value = 'new';
    document.querySelector('[data-deal="all"]').click();
  });
  filterProperties();
}
initializeCatalog().catch(function (error) { showNotice(error.message); });
