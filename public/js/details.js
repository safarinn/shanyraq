// СТРАНИЦА ОДНОГО ОБЪЕКТА И ЗАПИСЬ НА ПРОСМОТР
'use strict';
async function initializeDetails() {
  await siteReady;
  // Например, details.html?id=3 → propertyId равен 3.
  const parameters = new URLSearchParams(location.search);
  const propertyId = Number(parameters.get('id'));
  const result = await request('properties');
  let property = null;
  for (const item of result.items) {
    if (item.id === propertyId) property = item;
  }

  if (property === null) {
    document.getElementById('main').innerHTML = '<section class="container page"><h1>Объявление не найдено</h1><a href="catalog.html">Вернуться в каталог</a></section>';
    return;
  }

  document.title = property.title + ' — Shanyraq.kz';
  document.getElementById('property-title').textContent = property.title;
  document.getElementById('property-address').textContent = property.city + ' · ' + property.address;
  document.getElementById('property-price').textContent = formatPrice(property.price);
  document.getElementById('property-rooms').textContent = property.rooms + ' комн.';
  document.getElementById('property-area').textContent = property.area + ' м²';
  document.getElementById('property-floor').textContent = property.floor;
  document.getElementById('property-description').textContent = property.description;
  const image = document.querySelector('.detail-image');
  image.src = property.image;
  image.alt = 'Иллюстрация: ' + property.title;

  let dealName = 'Продажа';
  if (property.deal === 'rent') dealName = 'Аренда';
  document.getElementById('deal-label').textContent = dealName + ' · ' + getTypeName(property.type);
  let priceLabel = 'Стоимость объекта';
  if (property.deal === 'rent') priceLabel = 'Аренда за месяц';
  document.getElementById('price-label').textContent = priceLabel;

  const favoriteButton = document.getElementById('detail-fav');
  function updateButton() {
    if (app.favoriteIds.includes(propertyId)) {
      favoriteButton.textContent = '♥ В избранном';
    } else {
      favoriteButton.textContent = '♡ Сохранить';
    }
  }
  updateButton();
  favoriteButton.addEventListener('click', async function () {
    if (app.user === null) {
      location.href = 'login.html';
      return;
    }
    try {
      const favorites = await request('favorites', { property_id: propertyId });
      app.favoriteIds = favorites.ids;
      updateButton();
    } catch (error) {
      showNotice(error.message);
    }
  });

  const form = document.getElementById('booking-form');
  if (app.user === null) {
    form.hidden = true;
    document.getElementById('booking-login').hidden = false;
    return;
  }

  form.elements.visit_date.min = getTomorrow();
  form.elements.visit_date.value = getTomorrow();
  form.elements.phone.value = app.user.phone;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    form.querySelector('.message').textContent = '';
    if (!form.reportValidity()) return;

    const data = {
      property_id: propertyId,
      visit_date: form.elements.visit_date.value,
      visit_time: form.elements.visit_time.value,
      phone: form.elements.phone.value.trim(),
      message: form.elements.message.value.trim()
    };
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const booking = await request('bookings', data);
      form.hidden = true;
      const confirmation = document.getElementById('booking-confirmation');
      confirmation.hidden = false;
      const text = document.createElement('p');
      text.textContent = 'Заявка №' + booking.id + ' принята. Просмотр: ' + data.visit_date + ' в ' + data.visit_time;
      const link = document.createElement('a');
      link.href = 'profile.html';
      link.className = 'text-link';
      link.textContent = 'Посмотреть мои заявки →';
      confirmation.replaceChildren(text, link);
    } catch (error) {
      showFormError(form, error.message);
    } finally {
      button.disabled = false;
    }
  });
}
initializeDetails().catch(function (error) { showNotice(error.message); });
