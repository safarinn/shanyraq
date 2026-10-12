-- Таблицы проекта. Создаются автоматически при первом запуске.
CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS properties(
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    deal TEXT NOT NULL,
    type TEXT NOT NULL,
    price INTEGER NOT NULL,
    rooms INTEGER NOT NULL,
    area REAL NOT NULL,
    floor TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings(
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    property_title TEXT NOT NULL,
    visit_date TEXT NOT NULL,
    visit_time TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Новая',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS favorites(
    user_id INTEGER REFERENCES users(id),
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    PRIMARY KEY(user_id, property_id)
);

