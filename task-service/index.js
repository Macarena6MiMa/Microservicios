const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fetch = require('node-fetch'); // Si no está, asegúrate de instalarlo
const app = express();
const PORT = 3002;

app.use(express.json());
app.use(cors());

// DB setup
const db = new sqlite3.Database('/db/app.db', (err) => {
  if (err) console.error('DB error:', err);
  else console.log('Connected to SQLite');
});

// Crear tabla si no existe
db.run(`CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT CHECK(estado IN ('pendiente', 'en_progreso', 'completada')) DEFAULT 'pendiente',
  userId INTEGER NOT NULL
);`);

// Validar usuario con user-service
async function validarUsuario(userId) {
  try {
    const url = `http://user-service:3001/users/${userId}`;
    const resp = await fetch(url);
    console.log(`[TaskService] Validando usuario: GET ${url} → status: ${resp.status}`);
    return resp.ok;
  } catch (e) {
    console.error(`[TaskService] Error al validar usuario ${userId}:`, e);
    return false;
  }
}

// === ROUTER con prefijo /api/task ===
const taskRouter = express.Router();

// Crear nueva tarea
taskRouter.post('/', async (req, res) => {
  const { titulo, descripcion, userId } = req.body;
  if (!titulo || !userId) return res.status(400).json({ error: 'Faltan campos obligatorios' });

  const usuarioExiste = await validarUsuario(userId);
  if (!usuarioExiste) return res.status(404).json({ error: 'Usuario no existe' });

  db.run(
    'INSERT INTO tasks (titulo, descripcion, userId) VALUES (?, ?, ?)',
    [titulo, descripcion || '', userId],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, titulo, descripcion, estado: 'pendiente', userId });
    }
  );
});

// Obtener tarea específica
taskRouter.get('/:id', (req, res) => {
  db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(row);
  });
});

// Actualizar estado de una tarea
taskRouter.put('/:id', (req, res) => {
  const { estado } = req.body;
  if (!['pendiente', 'en_progreso', 'completada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido' });
  }
  db.run(
    'UPDATE tasks SET estado = ? WHERE id = ?',
    [estado, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
      res.json({ id: req.params.id, estado });
    }
  );
});

// Filtrar o listar tareas
taskRouter.get('/', (req, res) => {
  const { user_id } = req.query;
  if (user_id) {
    db.all('SELECT * FROM tasks WHERE userId = ?', [user_id], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } else {
    db.all('SELECT * FROM tasks', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  }
});

// === Registrar router con prefijo /api/task ===
app.use('/api/task', taskRouter);

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('Task Service is healthy');
});
app.listen(PORT, () => console.log(`Task Service running on port ${PORT}`));
