import express from 'express';
import setupExpressWs from 'express-ws';
import session, { SessionData } from 'express-session';
import redisStoreFactory from 'connect-redis';
import { SocketStore } from './src/socket-store';
import { createClient } from './src/redis-client';

declare module 'express-session' {
  interface SessionData {
    socketId: number;
    channel: string;
  }
}

function clientFactory() {
  const client = createClient();
  let connected = false;
  return async () => connected ?
    Promise.resolve(client) :
    client.connect().then(() => connected = true).then(() => client);
}

async function postMessage({ channel, message }: { channel: string, message: string }) {
  (await getClient()).publish(channel, message);
}

async function subscribe({ channel, clb }: { channel: string, clb: (m: string) => void }) {
  const subscriber = (await getClient()).duplicate();
  await subscriber.connect();
  await subscriber.subscribe(channel, clb);
  return subscriber;
}

const getClient = clientFactory();
const socketStore = new SocketStore();
(async () => {
  const client = await getClient();
  const app = express();
  const port = 3000;
  setupExpressWs(app);

  app.use(
    session({
      store: new ((redisStoreFactory as any)(session))({ client: client.wrapped }),
      saveUninitialized: true,
      secret: 'keyboard cat',
      cookie: {},
      resave: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static('public'));

  app.post('/subscribe', (req, res) => {
    const { channel } = req.body;
    req.session.channel = channel;
    const { socketId } = req.session;
    subscribe({
      channel,
      clb: m => socketId != null && socketStore.get(socketId)?.send(m)
    });
    res.sendStatus(200);
  });

  app.post('/send', async (req, res) => {
    const { channel } = req.session;
    const { message } = req.body;
    if (channel == null) {
      res.sendStatus(400);
    } else {
      try {
        await postMessage({ channel, message });
        res.sendStatus(200);
      } catch (e) {
        console.error(e);
        res.sendStatus(400);
      }
    }
  });

  (app as any).ws('/', async (ws: WebSocket, req: Express.Request) => {
    const id = socketStore.add(ws);
    const sessionKey = `sess:${req.sessionID}`;
    const session: SessionData = await client.get(sessionKey).then(s => JSON.parse(s));
    const ttl = await client.sendCommand(['TTL', sessionKey]);
    session.socketId = id;
    await client.set(sessionKey, JSON.stringify(session));
    await client.sendCommand(['EXPIRE', sessionKey, ttl]);
  });

  app.listen(
    port, () => console.log(`Example app listening at http://localhost:${port}`)
  );
})();



