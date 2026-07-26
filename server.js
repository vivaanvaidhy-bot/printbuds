import { createServer } from 'node:http';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const port = Number(process.env.PORT) || 3000;
const root = process.cwd();
const dataDirectory = join(root, 'data');
mkdirSync(dataDirectory, { recursive: true });

const db = new DatabaseSync(join(dataDirectory, 'inventory.sqlite'));
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    material REAL NOT NULL,
    labor REAL NOT NULL,
    price REAL NOT NULL,
    photo TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const listProducts = db.prepare('SELECT id, name, quantity AS qty, material, labor, price, photo FROM products ORDER BY created_at ASC');
const findProduct = db.prepare('SELECT id, name, quantity AS qty, material, labor, price, photo FROM products WHERE id = ?');
const insertProduct = db.prepare('INSERT INTO products (id, name, quantity, material, labor, price, photo) VALUES (?, ?, ?, ?, ?, ?, ?)');
const updateQuantity = db.prepare('UPDATE products SET quantity = ? WHERE id = ?');
const updatePhoto = db.prepare('UPDATE products SET photo = ? WHERE id = ?');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2_100_000) throw new Error('Request body is too large.');
  }
  return JSON.parse(body || '{}');
}

function validProduct(input) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const qty = Number(input.qty);
  const material = Number(input.material);
  const labor = Number(input.labor);
  const price = Number(input.price);
  const photo = typeof input.photo === 'string' ? input.photo : '';
  if (!name || !Number.isInteger(qty) || qty < 1 || ![material, labor, price].every(value => Number.isFinite(value) && value >= 0)) return null;
  if (photo.length > 2_000_000) return null;
  return { name, qty, material, labor, price, photo };
}

async function handleInventory(request, response) {
  if (request.method === 'GET') return sendJson(response, 200, listProducts.all());

  if (request.method === 'POST') {
    const product = validProduct(await readJson(request));
    if (!product) return sendJson(response, 400, { error: 'Please enter valid toy and pricing details.' });
    const id = crypto.randomUUID();
    insertProduct.run(id, product.name, product.qty, product.material, product.labor, product.price, product.photo);
    return sendJson(response, 201, findProduct.get(id));
  }

  if (request.method === 'PATCH') {
    const input = await readJson(request);
    const id = typeof input.id === 'string' ? input.id : '';
    if (typeof input.photo === 'string') {
      if (!id || input.photo.length > 2_000_000) return sendJson(response, 400, { error: 'Please choose a smaller photo.' });
      updatePhoto.run(input.photo, id);
      const product = findProduct.get(id);
      return product ? sendJson(response, 200, product) : sendJson(response, 404, { error: 'Toy not found.' });
    }
    const qty = Number(input.qty);
    if (!id || !Number.isInteger(qty) || qty < 0) return sendJson(response, 400, { error: 'Please enter a valid inventory quantity.' });
    updateQuantity.run(qty, id);
    const product = findProduct.get(id);
    return product ? sendJson(response, 200, product) : sendJson(response, 404, { error: 'Toy not found.' });
  }

  response.writeHead(405, { Allow: 'GET, POST, PATCH' });
  response.end();
}

function serveStatic(pathname, response) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
  response.end(readFileSync(filePath));
}

createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  try {
    if (pathname === '/api/inventory') await handleInventory(request, response);
    else serveStatic(pathname, response);
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: 'Inventory could not be saved right now.' });
  }
}).listen(port, () => console.log(`PrintBuds is running at http://localhost:${port}`));
