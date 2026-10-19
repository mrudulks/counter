import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from './config/env';
import { userFromToken } from './middleware/auth';
import { Restaurant } from './models/Restaurant';
import type { UserDoc } from './models/User';

export type OrderEventType = 'created' | 'items-added' | 'items-updated' | 'completed' | 'cancelled';

export interface OrderEvent {
  type: OrderEventType;
  order: unknown;
  /** Items this event is about (added or changed), when applicable */
  itemIds?: string[];
  actor: { id: string; name: string };
}

let io: Server | null = null;

const room = (restaurantId: unknown) => `restaurant:${String(restaurantId)}`;

/**
 * Every socket joins the room of the restaurant it works in. Superadmins have no
 * fixed restaurant, so the client tells us which one it is viewing via `restaurant:join`.
 */
export function initRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: env.corsOrigin.split(','), credentials: true } });

  io.use(async (socket, next) => {
    try {
      socket.data.user = await userFromToken(String(socket.handshake.auth?.token ?? ''));
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as UserDoc;
    if (user.role !== 'superadmin' && user.restaurant) socket.join(room(user.restaurant));

    socket.on('restaurant:join', async (restaurantId: unknown) => {
      if (user.role !== 'superadmin' || typeof restaurantId !== 'string') return;
      if (!/^[a-f\d]{24}$/i.test(restaurantId) || !(await Restaurant.exists({ _id: restaurantId }))) return;
      for (const r of socket.rooms) if (r.startsWith('restaurant:')) socket.leave(r);
      socket.join(room(restaurantId));
    });
  });
}

export function emitOrderEvent(restaurantId: unknown, event: OrderEvent) {
  io?.to(room(restaurantId)).emit('order:event', event);
}
