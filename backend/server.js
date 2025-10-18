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

const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : DEFAULT_ALLOWED_ORIGINS;

const allowAllOrigins = Array.isArray(configuredOrigins)
  ? configuredOrigins.includes('*')
  : configuredOrigins === '*';

const resolveCorsOrigin = (origin, callback) => {
  if (allowAllOrigins) {
    return callback(null, true);
  }

  if (!origin) {
    return callback(null, true);
  }

  if (configuredOrigins.includes(origin)) {
    return callback(null, true);
  }

  return callback(null, false);
};

const corsOptions = {
  origin: allowAllOrigins ? true : resolveCorsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', routes);
app.use(errorHandler);

const io = new Server(server, {
  cors: {
    origin: allowAllOrigins ? true : configuredOrigins,
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
