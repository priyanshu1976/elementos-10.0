import { createServer } from "http";
import app from "./app";
import { env } from "./config/env";

const server = createServer(app);

server.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT}`);
});

export default server;
