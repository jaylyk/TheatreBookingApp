import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { pingDb } from './config/db.js';
import { authRequired } from './middleware/auth.js';
import { resolveUser } from './middleware/currentUser.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import theatresRouter     from './routes/theatres.js';
import showsRouter        from './routes/shows.js';
import showtimesRouter    from './routes/showtimes.js';
import reservationsRouter from './routes/reservations.js';
import userRouter         from './routes/user.js';

const app = express();
app.use(cors());
app.use(express.json());

// Public endpoints (no auth)
app.get('/health',      (req, res) => res.json({ status: 'ok' }));
app.get('/auth/config', (req, res) => res.json({
  issuers: env.oidc.issuers,
  jwksUri: env.oidc.jwksUri,
}));

// Catalog endpoints — require valid JWT
app.use('/theatres',  authRequired, theatresRouter);
app.use('/shows',     authRequired, showsRouter);
app.use('/showtimes', authRequired, showtimesRouter);

// User-specific endpoints — also need the internal user_id
app.use('/reservations', authRequired, resolveUser, reservationsRouter);
app.use('/user',         authRequired, resolveUser, userRouter);

app.use(notFound);
app.use(errorHandler);

pingDb()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`[server] listening on http://localhost:${env.port}`);
      console.log(`[server] accepting tokens from issuers: ${env.oidc.issuers.join(', ')}`);
    });
  })
  .catch((err) => {
    console.error('[startup] DB ping failed:', err.message);
    process.exit(1);
  });
