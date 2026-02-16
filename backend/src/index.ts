import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";
import { initSocket } from "./socket";

const server = createServer(app);

initSocket(server);

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

export default server;
