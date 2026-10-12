// АДМИНКА: ТАБЛИЦЫ, CRUD ОБЪЯВЛЕНИЙ И СТАТУСЫ ЗАЯВОК
'use strict';
let adminProperties = [];
const editor = document.getElementById('editor');
const propertyForm = document.getElementById('property-form');

// Добавляет одну текстовую ячейку в строку таблицы.
function addCell(row, text) {
  const cell = document.createElement('td');
  cell.textContent = text;
  row.appendChild(cell);
  return cell;
}

function makeButton(text, className, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = text;
  button.className = className;
  button.addEventListener('click', action);
  return button;
}

// Одна и та же форма используется и для добавления, и для изменения.
function openEditor(property) {
  propertyForm.reset();
  propertyForm.querySelector('.message').textContent = '';
  propertyForm.elements.id.value = '';
  editor.querySelector('h2').textContent = 'Добавить объявление';

  if (property !== undefined) {
    editor.querySelector('h2').textContent = 'Изменить объявление';
    for (const name of ['id', 'title', 'city', 'address', 'deal', 'type', 'price', 'rooms', 'area', 'floor', 'description', 'image']) {
      propertyForm.elements[name].value = property[name];
    }
  }
  editor.showModal();
}

async function loadAdminTables() {
  const properties = await request('properties');
  const overview = await request('admin/overview');
  adminProperties = properties.items;

  const propertyTable = document.querySelector('#properties tbody');
  propertyTable.replaceChildren();
  for (const property of adminProperties) {
    const row = document.createElement('tr');
    const titleCell = addCell(row, '');
    const link = document.createElement('a');
    link.href = 'details.html?id=' + property.id;
    link.textContent = property.title;
    titleCell.appendChild(link);
    let deal = 'Продажа';
    if (property.deal === 'rent') deal = 'Аренда';
    addCell(row, property.city + ' / ' + deal);
    addCell(row, formatPrice(property.price));
    const actions = addCell(row, '');
    actions.appendChild(makeButton('Изменить', 'btn secondary small', function () {
      openEditor(property);
    }));
    actions.appendChild(makeButton('Удалить', 'btn danger small', async function () {
      const agreed = confirm('Удалить объявление? История заявок сохранится.');
      if (!agreed) return;
      try {
        await request('admin/delete', { id: property.id });
        await loadAdminTables();
        showNotice('Объявление удалено');
      } catch (error) {
        showNotice(error.message);
      }
    }));
    propertyTable.appendChild(row);
  }

  const bookingTable = document.querySelector('#bookings tbody');
  bookingTable.replaceChildren();
  for (const booking of overview.bookings) {
    const row = document.createElement('tr');
    addCell(row, '№' + booking.id + ' · ' + booking.property_title + ' · ' + booking.message);
    addCell(row, booking.email);
    addCell(row, booking.visit_date + ' ' + booking.visit_time + ' / ' + booking.phone);
    const cell = addCell(row, '');
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'Статус заявки ' + booking.id);
    for (const status of ['Новая', 'Подтверждена', 'Завершена', 'Отменена']) {
      const option = document.createElement('option');
      option.value = status;
      option.textContent = status;
      select.appendChild(option);
    }
    select.value = booking.status;
    select.addEventListener('change', async function () {
      try {
        await request('admin/status', { id: booking.id, status: select.value });
        showNotice('Статус обновлён');
      } catch (error) {
        select.value = booking.status;
        showNotice(error.message);
      }
    });
    cell.appendChild(select);
    bookingTable.appendChild(row);
  }

  const userTable = document.querySelector('#users tbody');
  userTable.replaceChildren();
  for (const user of overview.users) {
    const row = document.createElement('tr');
    addCell(row, user.first_name + ' ' + user.last_name);
    addCell(row, user.email);
    addCell(row, user.phone);
    let roleName = 'Пользователь';
    if (user.role === 'admin') roleName = 'Администратор';
    addCell(row, roleName);
    userTable.appendChild(row);
  }
}

async function initializeAdmin() {
  await siteReady;
  if (!requireLogin()) return;
  if (app.user.role !== 'admin') {
    document.getElementById('main').textContent = 'Доступ только для администратора.';
    return;
  }
  document.getElementById('admin-content').hidden = false;
  await loadAdminTables();

  document.getElementById('add-property').addEventListener('click', function () {
    openEditor();
  });
  document.getElementById('close-editor').addEventListener('click', function () {
    editor.close();
  });

  propertyForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    propertyForm.querySelector('.message').textContent = '';
    if (!propertyForm.reportValidity()) return;
    const data = {};
    // Имена полей формы совпадают с названиями столбцов в базе.
    for (const name of ['id', 'title', 'city', 'address', 'deal', 'type', 'price', 'rooms', 'area', 'floor', 'description', 'image']) {
      data[name] = propertyForm.elements[name].value;
    }
    const button = propertyForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await request('admin/property', data);
      editor.close();
      await loadAdminTables();
      showNotice('Объявление сохранено');
    } catch (error) {
      showFormError(propertyForm, error.message);
    } finally {
      button.disabled = false;
    }
  });
  if (location.hash === '#add') openEditor();
}
initializeAdmin().catch(function (error) { showNotice(error.message); });
