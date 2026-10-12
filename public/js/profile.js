// ЛИЧНЫЕ ДАННЫЕ И ИСТОРИЯ ЗАЯВОК
'use strict';
function fillProfile() {
  const user = app.user;
  document.querySelector('.page-title').textContent = 'Здравствуйте, ' + user.first_name + '!';
  document.getElementById('user-name').textContent = user.first_name + ' ' + user.last_name;
  document.getElementById('user-email').textContent = user.email;
  document.getElementById('user-avatar').textContent = user.first_name[0] + user.last_name[0];
  const form = document.getElementById('profile-form');
  form.elements.first_name.value = user.first_name;
  form.elements.last_name.value = user.last_name;
  form.elements.phone.value = user.phone;
  document.querySelector('aside a').textContent = '♡ Избранное (' + app.favoriteIds.length + ')';
}

async function loadBookings() {
  const result = await request('bookings');
  const list = document.getElementById('booking-list');
  const template = document.getElementById('booking-template');
  list.replaceChildren();

  if (result.items.length === 0) list.textContent = 'Вы пока не записались на просмотр.';
  for (const booking of result.items) {
    const row = template.content.firstElementChild.cloneNode(true);
    const title = row.querySelector('.booking-title');
    title.textContent = booking.property_title;
    if (booking.property_id !== null) {
      title.href = 'details.html?id=' + booking.property_id;
    } else {
      title.textContent += ' (объявление удалено)';
    }
    row.querySelector('.booking-date').textContent = '№' + booking.id + ' · ' + booking.visit_date + ' в ' + booking.visit_time;
    row.querySelector('.booking-message').textContent = booking.message;
    row.querySelector('.pill').textContent = booking.status;

    const cancelButton = row.querySelector('.cancel-button');
    cancelButton.hidden = booking.status !== 'Новая' && booking.status !== 'Подтверждена';
    cancelButton.addEventListener('click', async function () {
      try {
        await request('cancel', { id: booking.id });
        await loadBookings();
        showNotice('Заявка отменена');
      } catch (error) {
        showNotice(error.message);
      }
    });
    list.appendChild(row);
  }
}

async function initializeProfile() {
  await siteReady;
  if (!requireLogin()) return;
  fillProfile();
  await loadBookings();

  const form = document.getElementById('profile-form');
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    form.querySelector('.message').textContent = '';
    if (!form.reportValidity()) return;

    const data = {
      first_name: form.elements.first_name.value.trim(),
      last_name: form.elements.last_name.value.trim(),
      phone: form.elements.phone.value.trim()
    };
    try {
      await request('profile', data);
      const session = await request('session');
      app.user = session.user;
      updateNavigation();
      fillProfile();
      showNotice('Личные данные сохранены');
    } catch (error) {
      showFormError(form, error.message);
    }
  });
}
initializeProfile().catch(function (error) { showNotice(error.message); });
