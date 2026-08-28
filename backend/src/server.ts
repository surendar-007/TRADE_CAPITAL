import express from 'express';
import cors from 'cors';
import { router } from './routes/api';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', router);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'CSI Origin 2026 Supply-Chain Working Capital Engine',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Supply-Chain Working Capital Market Engine running on http://localhost:${PORT}`);
});
