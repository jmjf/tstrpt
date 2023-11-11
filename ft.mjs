import Fastify from 'fastify';
import hyperid from 'hyperid';
import fastifyCompress from '@fastify/compress';

function getHandler(request, reply) {
  const getId = hyperid({ urlSafe: true });

  // build a large reply so it will compress
  const data = [];
  for (let i = 0; i < 3000; i++) {
    data.push({i: i, id: getId()});
  }

  reply.code(200)
  .type('application/json')
  .send({ hello: 'world', reqId: request.id, data})
}

async function runServer() {
  const fastify = Fastify({
    logger: true,
    genReqId: hyperid({urlSafe: true})
  });

  await fastify.register(fastifyCompress, {
    global: false,
  });

  const routeOptions = {
    method: 'GET',
    url: '/test',
    handler: getHandler,
    compress: {
      encodings: ['br', 'deflate', 'gzip'],
      inflateIfDeflated: true,
      threshold: 128,
      removeContentLengthHeader: false,
      onUnsupportedEncoding: (encoding, request, reply) => {
        // only 406 if encoding is specified; otherwise return uncompressed
        if (encoding && encoding.length > 0) {
          reply.code(406);
          return `Encoding ${encoding} is not supported; reqId: ${request.id}`;
        }
      }
    }
  };
    
  await fastify.register(function(app, _, done) {
    app.route(routeOptions);
    done();
  }, { prefix: '/v1'} );
  
  // Run the server!
  fastify.listen({ port: 3000 }, function (err, address) {
    if (err) {
      fastify.log.error(err)
      process.exit(1)
    }
    // Server is now listening on ${address}
  })
}

runServer();

// performance (for 200 entries and 3000 entries on localhost)
// br -> 200 = ~550 bytes, ~9 ms; 3000 = ~5.7 KB, ~140 ms
// deflate -> 200 = ~1100 bytes, ~1 ms; 3000 = ~14.8 KB, ~4.5 ms
// gzip -> 200 = ~1100 bytes, ~1 ms; 3000 = ~14.8 KB, ~4.5 ms
// none -> 200 = ~8.4 KB, ~0.35 ms; 3000 = ~133 KB, ~3.3 ms