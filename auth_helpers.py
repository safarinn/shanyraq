"""Две вспомогательные функции для аккаунтов."""
import hashlib
import secrets


def password_hash(password, salt=None):
    """Сохраняем хеш пароля, а не сам пароль. Соль случайна для каждого аккаунта."""
    if salt is None:
        salt = secrets.token_hex(16)

    digest = hashlib.pbkdf2_hmac(
        'sha256', password.encode(), salt.encode(), 200000
    ).hex()
    return salt + ':' + digest


def public_user(row):
    """Отправляем браузеру только открытые поля пользователя, без хеша пароля."""
    return {
        'id': row['id'],
        'first_name': row['first_name'],
        'last_name': row['last_name'],
        'email': row['email'],
        'phone': row['phone'],
        'role': row['role']
    }
