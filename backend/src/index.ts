import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import userRoutes from './routes/userRoutes';
import companyRoutes from './routes/companyRoutes';
import jobRoutes from './routes/jobRoutes';

// Load variables from .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Register Middleware
app.use(cors());
app.use(express.json());

// Base Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'VeriWork API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Register REST Routes
app.use('/api/users', userRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express Error Boundary Captured:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`VeriWork REST API Server running on port ${PORT}`);
});
