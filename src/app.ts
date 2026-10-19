import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { authenticate, restaurantAccess } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error';
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import userRoutes from './routes/users';
import menuRoutes from './routes/menu';
import tableRoutes from './routes/tables';
import orderRoutes from './routes/orders';

export const app = express();

app.use(cors({ origin: env.corsOrigin.split(','), credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/restaurants', authenticate, restaurantRoutes);

const scoped = '/api/restaurants/:restaurantId';
app.use(`${scoped}/users`, authenticate, restaurantAccess, userRoutes);
app.use(`${scoped}/menu`, authenticate, restaurantAccess, menuRoutes);
app.use(`${scoped}/tables`, authenticate, restaurantAccess, tableRoutes);
app.use(`${scoped}/orders`, authenticate, restaurantAccess, orderRoutes);

app.use(notFound);
app.use(errorHandler);
