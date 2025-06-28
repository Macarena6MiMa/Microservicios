const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(express.json());
app.use(cors());

// DB setup
const db = new sqlite3.Database('/db/app.db', (err) => {
  if (err) console.error('DB error:', err);
  else console.log('Connected to SQLite');
});

// Crear tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL
);`);

// === ROUTER para /api/user ===
const userRouter = express.Router();

// Crear nuevo usuario
userRouter.post('/', (req, res) => {
  const { email, nombre } = req.body;
  if (!email || !nombre) return res.status(400).json({ error: 'Campos obligatorios' });
  db.run(
    'INSERT INTO users (email, nombre) VALUES (?, ?)',
    [email, nombre],
    function (err) {
      if (err) return res.status(409).json({ error: 'Email ya registrado' });
      res.status(201).json({ id: this.lastID, email, nombre });
    }
  );
});

// Listar todos los usuarios
userRouter.get('/', (req, res) => {
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Obtener usuario por ID
userRouter.get('/:id', (req, res) => {
  db.get('SELECT * FROM users WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(row);
  });
});

// Registrar el prefijo /api/user
app.use('/api/users', userRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('User Service is healthy');
});

app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));
