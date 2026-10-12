# Requirements coverage

Source: `docs/requirements.docx` — Web Programming Project Requirements.

**User-requested exception:** the original technical checklist mentions CSS Grid. This revision uses Flexbox throughout, with no Grid declarations. All other listed features are retained. See `CODE_GUIDE.md` for explanations in Russian.

| Step | Requirement | Implementation |
|---|---|---|
| 1 | Registration and validation | `register.html`: first name, last name, email, password, confirmation, optional phone. Static HTML form + readable auth.js; client + server checks, unique email in SQLite. |
| 2 | Login and errors | `login.html`: email, password, registration link. Empty / invalid inputs and wrong credentials produce errors. |
| 3 | Home after authentication | Registration/login redirects to `index.html`; logo, name, navigation, hero, CTA, catalog, user name and logout. |
| 4 | Consistent working navigation | Shared header/footer; active page; catalog, about, favorites, profile, admin (role-dependent); detail links from cards. |
| 5 | Topic functionality | Browse sale/rental property → filter → details → viewing request → confirmation → history. |
| 6 | At least 6–8 items | Eight initial properties in three cities, three categories, two deal types. |
| 7 | Details | `details.html?id=…`: illustration, title, location, description, price, room count, area, floor, favorite and viewing form. |
| 8 | Appropriate booking form | Date, available time slot, phone and optional message; requires authentication. |
| 9 | Confirmation | Success panel displays booking number, date, time and link to history. |
| 10 | Profile | `profile.html`: name, email, phone, edit form, favorites, viewing history, cancellation and global logout. |
| 11 | Admin panel | `admin.html`: users, properties, bookings, booking status changes; server-enforced role. |
| 12 | CRUD | Admin property creation, reading, editing, deletion in SQLite. |
| 13 | At least five validation errors | Missing name, malformed email, short password, password mismatch, duplicate email, malformed phone, non-future date, invalid price, duplicate booking. |
| 14 | Search/filter | Live text search, city/type/deal/max-price filters, sorting, reset, result count and empty state. |
| 15 | Responsive | Flexbox + CSS media queries at 1000/720 px; 3/2/1-column cards, collapsing navigation, stacked forms and detail layout. Manual browser QA checklist in README. |
| 16 | Consistency | Shared palette, system font, buttons, cards, form fields, spacing, header and footer. |
| 17 | Footer | Every HTML page includes shared footer; About, Contact, Privacy, Terms. |
| 18 | Organized project | `public/` HTML, `css/`, `js/`, `images/`; backend, tests, docs and README. |
| 19 | HTML/CSS/JavaScript | Semantic header/main/section/article/aside/footer, forms/links/images/lists/tables; selectors/box model/Flexbox/media queries/hover/transitions; CSS Grid deliberately omitted at user request; variables/functions/conditions/events/DOM/validation/dynamic data. |

The backend is an additional dependency-free Python/SQLite implementation, so accounts and CRUD persist on the server rather than being simulated in localStorage. Images are bundled original SVG illustrations. All listings and requests are educational demonstrations.

## Readable implementation

Forms, navigation and tables are written directly in the HTML pages. JavaScript is separated into `common.js`, `auth.js`, `catalog.js`, `details.js`, `favorites.js`, `profile.js`, and `admin.js`. The database schema is in `schema.sql`; initial listings are in `sample_properties.json`. Russian comments and `CODE_GUIDE.md` explain the implementation.
