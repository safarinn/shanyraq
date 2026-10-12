// РЕГИСТРАЦИЯ И ВХОД
'use strict';
async function initializeAuth() {
  await siteReady;
  const form = document.getElementById('auth-form');
  const isRegistration = document.body.dataset.page === 'register';

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    form.querySelector('.message').textContent = '';
    if (!form.reportValidity()) return;

    const data = {
      email: form.elements.email.value.trim(),
      password: form.elements.password.value
    };
    let route = 'login';

    if (isRegistration) {
      route = 'register';
      data.first_name = form.elements.first_name.value.trim();
      data.last_name = form.elements.last_name.value.trim();
      data.phone = form.elements.phone.value.trim();
      data.confirm = form.elements.confirm.value;

      if (data.password !== data.confirm) {
        showFormError(form, 'Пароли не совпадают.');
        return;
      }
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await request(route, data);
      location.href = 'index.html';
    } catch (error) {
      showFormError(form, error.message);
    } finally {
      button.disabled = false;
    }
  });
}
initializeAuth().catch(function (error) { showNotice(error.message); });
