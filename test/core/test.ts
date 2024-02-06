import makeServer from './server';

(async () => {
  const server = await makeServer();

  server.listen({ port: 3000 });
})();
