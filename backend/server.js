const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const eventBus = require('./lib/eventBus');

dotenv.config();

const app = express();
const server = http.createServer(app);

const DEFAULT_ALLOWED_ORIGINS = [
  'https://projek-n8n-crm-frontend.qk6yxt.easypanel.host',
  'http://localhost:3000'
];

const normalizeOrigin = (origin) => {
  if (!origin) {
    return origin;
  }

  try {
    const { origin: parsedOrigin } = new URL(origin);
    return parsedOrigin;
  } catch (_error) {
    return origin.replace(/\/$/, '');
  }
};

const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : DEFAULT_ALLOWED_ORIGINS;

const allowedOrigins = new Set(configuredOrigins.map(normalizeOrigin));

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.has('*')) {
    return true;
  }

  return allowedOrigins.has(normalizeOrigin(origin));
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, origin || true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204
};

const socketCorsOrigin = allowedOrigins.has('*')
  ? true
  : Array.from(allowedOrigins);

app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;

  if (isOriginAllowed(requestOrigin) && requestOrigin) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

const io = new Server(server, {
  cors: {
    origin: socketCorsOrigin,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('Token diperlukan'));
  }
  return next();
});

eventBus.on('new_message', (payload) => io.emit('new_message', payload));
eventBus.on('new_lead', (payload) => io.emit('new_lead', payload));
eventBus.on('campaign_created', (payload) => io.emit('campaign_created', payload));
eventBus.on('campaign_updated', (payload) => io.emit('campaign_updated', payload));
eventBus.on('customer_updated', (payload) => io.emit('customer_updated', payload));
eventBus.on('pending_followups', (payload) => io.emit('pending_followups', payload));
eventBus.on('notification', (payload) => io.emit('notification', payload));
eventBus.on('campaign_stats', (payload) => io.emit('campaign_stats', payload));

eventBus.setMaxListeners(20);

const port = process.env.PORT || 3001;
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server berjalan di port ${port}`);
});
