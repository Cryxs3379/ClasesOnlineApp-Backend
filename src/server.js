require('dotenv').config();

const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socket/socket');

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
