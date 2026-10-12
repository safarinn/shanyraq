"""Сервер Shanyraq: принимает запросы от JavaScript и возвращает JSON.
Запуск: python3 server.py. Логика разбита на секции с названиями маршрутов.
"""
from database import ROOT, connect, initialize
from auth_helpers import password_hash, public_user

import argparse
import hmac
import json
import re
import secrets
import sqlite3
import time
from datetime import date
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
SESSIONS = {}

class Handler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'public'), **kwargs)

    def log_message(self, *args):
        pass

  
    def send_json(self, status, data, cookie=None):
        raw = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

  
    def session(self):
        cookies = {}
        for part in self.headers.get('Cookie', '').split(';'):
            if '=' in part:
                name, value = part.strip().split('=', 1)
                cookies[name] = value
        token = cookies.get('shanyraq_session', '')
        session_data = SESSIONS.get(token)
        if session_data and session_data['expires'] > time.time():
            return (token, session_data)
        return (token, None)

    # GET: отдать HTML/CSS/JS или получить данные API.
    def do_GET(self):
        if urlparse(self.path).path.startswith('/api/'):
            try:
                self.api('GET')
            except Exception:
                self.send_json(500, {'error': 'Не удалось выполнить запрос.'})
        else:
            super().do_GET()

    # POST: принять отправленную форму.
    def do_POST(self):
        try:
            self.api('POST')
        except (ValueError, KeyError, TypeError):
            self.send_json(400, {'error': 'Проверьте введённые данные.'})
        except sqlite3.IntegrityError:
            self.send_json(409, {'error': 'Этот email уже зарегистрирован или данные конфликтуют.'})
        except Exception:
            self.send_json(500, {'error': 'Не удалось выполнить запрос.'})

    # Главная функция: выбирает действие по URL /api/…
    def api(self, method):
        path = urlparse(self.path).path
        token, session_data = self.session()
        data = {}
        if method == 'POST':
            size = int(self.headers.get('Content-Length', '0'))
            if size > 65536:
                return self.send_json(413, {'error': 'Запрос слишком большой.'})
            data = json.loads(self.rfile.read(size) or '{}')
            origin = self.headers.get('Origin')
            if origin and urlparse(origin).netloc != self.headers.get('Host'):
                return self.send_json(403, {'error': 'Недопустимый источник запроса.'})
            if session_data and (not hmac.compare_digest(self.headers.get('X-CSRF-Token', ''), session_data['csrf'])):
                return self.send_json(403, {'error': 'Обновите страницу и повторите действие.'})
        with connect() as connection:
            user = connection.execute('SELECT * FROM users WHERE id=?', (session_data['uid'],)).fetchone() if session_data else None
            # Текущий пользователь и токен защиты
            if path == '/api/session' and method == 'GET':
                return self.send_json(200, {'user': public_user(user) if user else None, 'csrf': session_data['csrf'] if session_data else ''})
            # Список объявлений — доступен всем
            if path == '/api/properties' and method == 'GET':
                return self.send_json(200, {'items': [dict(row) for row in connection.execute('SELECT * FROM properties ORDER BY id DESC')]})
            if path in ('/api/register', '/api/login') and method == 'POST':
                email = str(data.get('email', '')).strip().lower()
                password = str(data.get('password', ''))
                if not re.fullmatch('[^\\s@]+@[^\\s@]+\\.[^\\s@]+', email):
                    return self.send_json(400, {'error': 'Введите корректный email.'})
                if path.endswith('register'):
                    first = str(data.get('first_name', '')).strip()
                    last = str(data.get('last_name', '')).strip()
                    phone = str(data.get('phone', '')).strip()
                    if not first or not last or len(first) > 80 or (len(last) > 80):
                        return self.send_json(400, {'error': 'Укажите имя и фамилию (до 80 символов).'})
                    if len(password) < 8 or len(password) > 128:
                        return self.send_json(400, {'error': 'Пароль должен содержать от 8 до 128 символов.'})
                    if password != data.get('confirm'):
                        return self.send_json(400, {'error': 'Пароли не совпадают.'})
                    if phone and (not re.fullmatch('\\+?[\\d ()-]{10,20}', phone)):
                        return self.send_json(400, {'error': 'Введите корректный номер телефона.'})
                    connection.execute('INSERT INTO users(first_name,last_name,email,password,phone) VALUES(?,?,?,?,?)', (first, last, email, password_hash(password), phone))
                    connection.commit()
                user = connection.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
                if not user or not hmac.compare_digest(user['password'], password_hash(password, user['password'].split(':')[0])):
                    return self.send_json(401, {'error': 'Неверный email или пароль.'})
                if token:
                    SESSIONS.pop(token, None)
                token = secrets.token_urlsafe(32)
                SESSIONS[token] = {'uid': user['id'], 'csrf': secrets.token_urlsafe(32), 'expires': time.time() + 86400}
                return self.send_json(200, {'user': public_user(user), 'csrf': SESSIONS[token]['csrf']}, f'shanyraq_session={token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400')
            if not user:
                return self.send_json(401, {'error': 'Войдите в аккаунт.'})
            # Выход из аккаунта
            if path == '/api/logout' and method == 'POST':
                SESSIONS.pop(token, None)
                return self.send_json(200, {'ok': True}, 'shanyraq_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
            # Редактирование личных данных
            if path == '/api/profile' and method == 'POST':
                first = str(data.get('first_name', '')).strip()
                last = str(data.get('last_name', '')).strip()
                phone = str(data.get('phone', '')).strip()
                if not first or not last or max(len(first), len(last)) > 80:
                    return self.send_json(400, {'error': 'Имя и фамилия обязательны (до 80 символов).'})
                if phone and (not re.fullmatch('\\+?[\\d ()-]{10,20}', phone)):
                    return self.send_json(400, {'error': 'Некорректный телефон.'})
                connection.execute('UPDATE users SET first_name=?,last_name=?,phone=? WHERE id=?', (first, last, phone, user['id']))
                return self.send_json(200, {'ok': True})
            # Добавление/удаление избранного
            if path == '/api/favorites':
                if method == 'POST':
                    property_id = int(data['property_id'])
                    if not connection.execute('SELECT id FROM properties WHERE id=?', (property_id,)).fetchone():
                        return self.send_json(404, {'error': 'Объявление не найдено.'})
                    if connection.execute('SELECT 1 FROM favorites WHERE user_id=? AND property_id=?', (user['id'], property_id)).fetchone():
                        connection.execute('DELETE FROM favorites WHERE user_id=? AND property_id=?', (user['id'], property_id))
                    else:
                        connection.execute('INSERT INTO favorites VALUES(?,?)', (user['id'], property_id))
                return self.send_json(200, {'ids': [row[0] for row in connection.execute('SELECT property_id FROM favorites WHERE user_id=?', (user['id'],))]})
            # Создание заявки или история пользователя
            if path == '/api/bookings':
                if method == 'POST':
                    prop = connection.execute('SELECT * FROM properties WHERE id=?', (int(data['property_id']),)).fetchone()
                    if not prop:
                        return self.send_json(404, {'error': 'Объявление не найдено.'})
                    day = date.fromisoformat(data['visit_date'])
                    hour = data.get('visit_time', '')
                    phone = str(data.get('phone', '')).strip()
                    message = str(data.get('message', '')).strip()
                    if day <= date.today():
                        return self.send_json(400, {'error': 'Выберите дату начиная с завтрашнего дня.'})
                    if hour not in ['10:00', '12:00', '14:00', '16:00', '18:00']:
                        return self.send_json(400, {'error': 'Выберите время просмотра.'})
                    if not re.fullmatch('\\+?[\\d ()-]{10,20}', phone):
                        return self.send_json(400, {'error': 'Укажите корректный телефон.'})
                    if len(message) > 1000:
                        return self.send_json(400, {'error': 'Сообщение не должно превышать 1000 символов.'})
                    if connection.execute("SELECT id FROM bookings WHERE user_id=? AND property_id=? AND visit_date=? AND visit_time=? AND status!='Отменена'", (user['id'], prop['id'], str(day), hour)).fetchone():
                        return self.send_json(409, {'error': 'Вы уже записаны на этот просмотр.'})
                    cursor = connection.execute('INSERT INTO bookings(user_id,property_id,property_title,visit_date,visit_time,phone,message) VALUES(?,?,?,?,?,?,?)', (user['id'], prop['id'], prop['title'], str(day), hour, phone, message))
                    return self.send_json(201, {'id': cursor.lastrowid, 'ok': True})
                return self.send_json(200, {'items': [dict(row) for row in connection.execute('SELECT * FROM bookings WHERE user_id=? ORDER BY id DESC', (user['id'],))]})
            # Отмена собственной заявки
            if path == '/api/cancel' and method == 'POST':
                changed = connection.execute("UPDATE bookings SET status='Отменена' WHERE id=? AND user_id=? AND status IN ('Новая','Подтверждена')", (int(data['id']), user['id'])).rowcount
                return self.send_json(200 if changed else 400, {'ok': True} if changed else {'error': 'Эту заявку нельзя отменить.'})
            # Проверка прав администратора
            if path.startswith('/api/admin/'):
                if user['role'] != 'admin':
                    return self.send_json(403, {'error': 'Доступ только для администратора.'})
                # Пользователи и все заявки
                if path == '/api/admin/overview' and method == 'GET':
                    return self.send_json(200, {'users': [public_user(row) for row in connection.execute('SELECT * FROM users')], 'bookings': [dict(row) for row in connection.execute('SELECT b.*,u.email FROM bookings b JOIN users u ON b.user_id=u.id ORDER BY b.id DESC')]})
                # Изменение статуса заявки
                if path == '/api/admin/status' and method == 'POST':
                    if data['status'] not in ['Новая', 'Подтверждена', 'Завершена', 'Отменена']:
                        return self.send_json(400, {'error': 'Некорректный статус.'})
                    if not connection.execute('UPDATE bookings SET status=? WHERE id=?', (data['status'], int(data['id']))).rowcount:
                        return self.send_json(404, {'error': 'Заявка не найдена.'})
                    return self.send_json(200, {'ok': True})
                # Удаление объявления
                if path == '/api/admin/delete' and method == 'POST':
                    if not connection.execute('DELETE FROM properties WHERE id=?', (int(data['id']),)).rowcount:
                        return self.send_json(404, {'error': 'Объявление не найдено.'})
                    return self.send_json(200, {'ok': True})
                # Создание или изменение объявления
                if path == '/api/admin/property' and method == 'POST':
                    keys = ['title', 'city', 'address', 'deal', 'type', 'price', 'rooms', 'area', 'floor', 'description', 'image']
                    vals = [data.get(k, '') for k in keys]
                    if any((not str(v).strip() for v in vals)):
                        return self.send_json(400, {'error': 'Заполните все поля объявления.'})
                    if data['city'] not in ['Алматы', 'Астана', 'Шымкент'] or data['deal'] not in ['sale', 'rent'] or data['type'] not in ['apartment', 'house', 'commercial']:
                        return self.send_json(400, {'error': 'Некорректная категория.'})
                    if not 0 < float(data['area']) <= 100000 or not 0 < int(data['price']) <= 1000000000000 or (not 1 <= int(data['rooms']) <= 50):
                        return self.send_json(400, {'error': 'Цена, площадь и количество комнат должны быть положительными и в допустимых пределах.'})
                    if not re.fullmatch('images/home-[1-8]\\.svg', data['image']):
                        return self.send_json(400, {'error': 'Выберите изображение из галереи.'})
                    if data.get('id'):
                        if not connection.execute('UPDATE properties SET ' + ','.join((k + '=?' for k in keys)) + ' WHERE id=?', (*vals, int(data['id']))).rowcount:
                            return self.send_json(404, {'error': 'Объявление не найдено.'})
                    else:
                        connection.execute('INSERT INTO properties(' + ','.join(keys) + ') VALUES(' + ','.join(('?' for _ in keys)) + ')', vals)
                    return self.send_json(200, {'ok': True})
            return self.send_json(404, {'error': 'Маршрут не найден.'})
if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--host', default='127.0.0.1')
    arguments = parser.parse_args()
    initialize()
    print(f'Shanyraq.kz: http://{arguments.host}:{arguments.port} (Ctrl+C to stop)', flush=True)
    ThreadingHTTPServer((arguments.host, arguments.port), Handler).serve_forever()
