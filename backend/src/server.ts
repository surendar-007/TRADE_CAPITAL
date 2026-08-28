import express from 'express';
import cors from 'cors';
import path from 'path';
import { router } from './routes/api';
import { Database } from './data/db';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// API Routes
app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'CSI Origin 2026 Supply-Chain Working Capital Engine',
    timestamp: new Date().toISOString()
  });
});

// Initialize database then start server
Database.initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Supply-Chain Working Capital Market Engine running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Failed to start server due to database initialization error:", err);
  process.exit(1);
});
