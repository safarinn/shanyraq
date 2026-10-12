// ОБЩИЕ ФУНКЦИИ ДЛЯ ВСЕХ СТРАНИЦ
// Этот файл подключается первым. Здесь нет кода конкретной страницы.
'use strict';

const app = {
  user: null,          // Пользователь, который сейчас вошёл в аккаунт.
  csrf: '',            // Защитный токен для запросов, изменяющих данные.
  favoriteIds: []       // Номера объявлений в избранном.
};

// GET получает данные. POST отправляет данные серверу.
async function request(path, data) {
  const options = {};

  if (data !== undefined) {
    options.method = 'POST';
    options.headers = {
      'Content-Type': 'application/json',
      'X-CSRF-Token': app.csrf
    };
    options.body = JSON.stringify(data);
  }

  const response = await fetch('/api/' + path, options);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error);
  }

  return result;
}

// Короткое уведомление внизу страницы.
function showNotice(text) {
  const notice = document.getElementById('toast');
  notice.textContent = text;
  notice.hidden = false;

  setTimeout(function () {
    notice.hidden = true;
  }, 5000);
}

function showFormError(form, text) {
  const message = form.querySelector('.message');
  message.textContent = text;
  message.className = 'message error';
  message.setAttribute('role', 'alert');
}

function formatPrice(price) {
  return Number(price).toLocaleString('ru-KZ') + ' ₸';
}

function getTypeName(type) {
  if (type === 'house') return 'Дом';
  if (type === 'commercial') return 'Коммерческая';
  return 'Квартира';
}

// Завтрашняя дата в формате, который понимает input type="date".
function getTomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

// Скрываем защищённую страницу, если пользователь не вошёл.
// Сервер также проверяет вход: скрыть страницу — не защита само по себе.
function requireLogin() {
  if (app.user !== null) return true;

  document.getElementById('main').innerHTML = `
    <section class="container page">
      <h1 class="page-title">Войдите в аккаунт</h1>
      <p>Эта страница доступна после входа.</p>
      <a class="btn" href="login.html">Войти</a>
      <a class="btn secondary" href="register.html">Регистрация</a>
    </section>
  `;
  return false;
}

function updateNavigation() {
  const loggedIn = app.user !== null;
  document.getElementById('login-link').hidden = loggedIn;
  document.getElementById('profile-link').hidden = !loggedIn;
  document.getElementById('logout-button').hidden = !loggedIn;

  let isAdmin = false;
  if (loggedIn) {
    isAdmin = app.user.role === 'admin';
    document.getElementById('profile-link').textContent = app.user.first_name;
  }
  document.getElementById('admin-link').hidden = !isAdmin;
  if (isAdmin) {
    document.getElementById('publish-link').href = 'admin.html#add';
  } else {
    document.getElementById('publish-link').href = 'contact.html';
  }
}

// Рисуем карточки из HTML-шаблона <template id="property-template">.
// textContent вставляет текст безопасно, не превращая его в HTML.
function displayProperties(properties, container) {
  container.replaceChildren();
  const template = document.getElementById('property-template');

  if (properties.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'Ничего не найдено. Измените фильтры или добавьте объект в избранное.';
    container.appendChild(empty);
  }

  for (const property of properties) {
    const card = template.content.firstElementChild.cloneNode(true);
    const links = card.querySelectorAll('a');
    for (const link of links) {
      link.href = 'details.html?id=' + property.id;
    }

    const image = card.querySelector('img');
    image.src = property.image;
    image.alt = 'Иллюстрация: ' + property.title;

    let dealName = 'Продажа';
    let price = formatPrice(property.price);
    if (property.deal === 'rent') {
      dealName = 'Аренда';
      price += ' / месяц';
    }

    card.querySelector('.badge').textContent = dealName + ' · ' + getTypeName(property.type);
    card.querySelector('.price').textContent = price;
    card.querySelector('.property-title').textContent = property.title;
    card.querySelector('.address').textContent = property.city + ' · ' + property.address;
    card.querySelector('.rooms').textContent = property.rooms + ' комн.';
    card.querySelector('.area').textContent = property.area + ' м²';
    card.querySelector('.floor').textContent = property.floor;

    const button = card.querySelector('.favorite');
    updateFavoriteButton(button, property.id);
    button.addEventListener('click', async function () {
      if (app.user === null) {
        location.href = 'login.html';
        return;
      }
      try {
        const result = await request('favorites', { property_id: property.id });
        app.favoriteIds = result.ids;
        updateFavoriteButton(button, property.id);
        // Страница избранного слушает событие и удаляет ненужную карточку.
        document.dispatchEvent(new Event('favorites-changed'));
      } catch (error) {
        showNotice(error.message);
      }
    });

    container.appendChild(card);
  }
}

function updateFavoriteButton(button, propertyId) {
  const saved = app.favoriteIds.includes(propertyId);
  if (saved) {
    button.textContent = '♥';
    button.setAttribute('aria-label', 'Убрать из избранного');
  } else {
    button.textContent = '♡';
    button.setAttribute('aria-label', 'Добавить в избранное');
  }
  button.classList.toggle('saved', saved);
  button.setAttribute('aria-pressed', String(saved));
}

// Общая подготовка: узнаём пользователя и его избранное.
async function initializeSite() {
  const session = await request('session');
  app.user = session.user;
  app.csrf = session.csrf;

  if (app.user !== null) {
    const favorites = await request('favorites');
    app.favoriteIds = favorites.ids;
  }
  updateNavigation();
}

const menuButton = document.getElementById('menu-button');
menuButton.addEventListener('click', function () {
  const menu = document.getElementById('navigation');
  const isOpen = menu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});

document.getElementById('logout-button').addEventListener('click', async function () {
  try {
    await request('logout', {});
    location.href = 'login.html';
  } catch (error) {
    showNotice(error.message);
  }
});

// Файлы страниц ждут siteReady перед обращением к app.user.
const siteReady = initializeSite();
siteReady.catch(function () {
  showNotice('Сервер недоступен. Запустите python3 server.py и откройте http://127.0.0.1:8000.');
});
