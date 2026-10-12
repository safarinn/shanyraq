// Проверяем поиск и сортировку без браузера и сторонних библиотек.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const elements = {};
for (const id of ['city', 'type', 'max-price', 'query', 'sort', 'result-count', 'results']) {
  elements[id] = { value: '', textContent: '' };
}
elements.sort.value = 'new';
let displayed = [];
const context = vm.createContext({
  document: { getElementById(id) { return elements[id]; } },
  displayProperties(items) { displayed = JSON.parse(JSON.stringify(items)); }
});
let source = fs.readFileSync(path.join(root, 'public/js/catalog.js'), 'utf8');
source = source.replace(/initializeCatalog\(\)\.catch[\s\S]*$/, '');
vm.runInContext(source, context);
const items = JSON.parse(fs.readFileSync(path.join(root, 'sample_properties.json'), 'utf8'));
vm.runInContext('allProperties = ' + JSON.stringify(items), context);
vm.runInContext('filterProperties()', context);
assert.equal(displayed.length, 8);
elements.city.value = 'Алматы';
vm.runInContext('filterProperties()', context);
assert.equal(displayed.length, 4);
elements.type.value = 'house';
vm.runInContext('filterProperties()', context);
assert.equal(displayed.length, 1);
elements.city.value = '';
elements.type.value = '';
vm.runInContext("selectedDeal = 'rent'; filterProperties()", context);
assert.equal(displayed.length, 4);
elements['max-price'].value = '300000';
vm.runInContext('filterProperties()', context);
assert.equal(displayed.length, 1);
elements['max-price'].value = '';
elements.query.value = 'не существующий район';
vm.runInContext('filterProperties()', context);
assert.equal(displayed.length, 0);
elements.query.value = 'AFD';
vm.runInContext("selectedDeal = 'all'; filterProperties()", context);
assert.equal(displayed.length, 1);
elements.query.value = '';
elements.sort.value = 'asc';
vm.runInContext('filterProperties()', context);
assert.ok(displayed.every((item, index) => index === 0 || displayed[index - 1].price <= item.price));
elements.sort.value = 'desc';
vm.runInContext('filterProperties()', context);
assert.ok(displayed.every((item, index) => index === 0 || displayed[index - 1].price >= item.price));
console.log('Frontend search/filter/sort: OK');
