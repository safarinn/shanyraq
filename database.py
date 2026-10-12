"""База данных и начальные объявления. Здесь нет обработки HTTP-запросов."""
import json
import os
import sqlite3
from pathlib import Path
from auth_helpers import password_hash

ROOT = Path(__file__).resolve().parent
DATABASE_FILE = Path(os.environ.get('SHANYRAQ_DB', str(ROOT / 'data' / 'shanyraq.sqlite3')))


def connect():
    """Открыть SQLite. Строки можно читать по названию столбца."""
    connection = sqlite3.connect(DATABASE_FILE)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys=ON')
    return connection


def initialize():
    """Создать таблицы, демонстрационного администратора и 8 объявлений."""
    DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with connect() as connection:
        schema = (ROOT / 'schema.sql').read_text(encoding='utf-8')
        connection.executescript(schema)

        admin = connection.execute(
            'SELECT id FROM users WHERE email=?',
            ('admin@shanyraq.kz',)
        ).fetchone()
        if admin is None:
            connection.execute(
                'INSERT INTO users(first_name,last_name,email,password,role) VALUES(?,?,?,?,?)',
                ('Администратор', 'Shanyraq', 'admin@shanyraq.kz', password_hash('Admin2026!'), 'admin')
            )

        first_property = connection.execute('SELECT id FROM properties').fetchone()
        if first_property is None:
            text = (ROOT / 'sample_properties.json').read_text(encoding='utf-8')
            properties = json.loads(text)
            for property in properties:
                connection.execute(
                    '''INSERT INTO properties
                       (title,city,address,deal,type,price,rooms,area,floor,description,image)
                       VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
                    (
                        property['title'], property['city'], property['address'],
                        property['deal'], property['type'], property['price'],
                        property['rooms'], property['area'], property['floor'],
                        property['description'], property['image']
                    )
                )
