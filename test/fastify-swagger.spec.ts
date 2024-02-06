import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import Fastify from 'fastify';
import * as validator from 'oas-validator';
import * as v from 'valibot';

import type { ValibotTypeProvider } from '../src';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from '../src';

describe('transformer', () => {
  it('generates types for fastify-swagger correctly', async () => {
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler());
    app.setSerializerCompiler(serializerCompiler);

    app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'SampleApi',
          description: 'Sample backend service',
          version: '1.0.0',
        },
        servers: [],
      },
      transform: jsonSchemaTransform,
    });

    app.register(fastifySwaggerUI, {
      routePrefix: '/documentation',
    });

    const LOGIN_SCHEMA = v.object({
      username: v.string([v.maxLength(32, 'someDescription')]),
      seed: v.number(),
      password: v.string([v.maxLength(32)]),
    });

    const UNAUTHORIZED_SCHEMA = v.object({
      required_role: v.literal('admin'),
    });

    app.after(() => {
      app
        .withTypeProvider<ValibotTypeProvider>()
        .route({
          method: 'POST',
          url: '/login',
          schema: {
            description: 'login route',
            summary: 'login your account',
            consumes: ['application/json'],
            deprecated: false,
            hide: false,
            tags: ['auth'],
            externalDocs: { url: 'https://google.com', description: 'check google' },
            body: LOGIN_SCHEMA,
            response: {
              200: v.string(),
              401: UNAUTHORIZED_SCHEMA,
            },
          },
          handler: (req, res) => {
            res.send('ok');
          },
        })
        .route({
          method: 'POST',
          url: '/no-schema',
          schema: undefined,
          handler: (req, res) => {
            res.send('ok');
          },
        })
        .route({
          method: 'DELETE',
          url: '/delete',
          schema: {
            description: 'delete route',
            response: {
              204: v.string(),
            },
          },
          handler: (req, res) => {
            res.status(204).send();
          },
        });
    });

    await app.ready();

    const openApiSpecResponse = await app.inject().get('/documentation/json');
    const openApiSpec = JSON.parse(openApiSpecResponse.body);

    expect(openApiSpec).toMatchSnapshot();
    await validator.validate(openApiSpec, {});
  });

  it('should not generate ref', async () => {
    const app = Fastify();
    app.setValidatorCompiler(validatorCompiler());
    app.setSerializerCompiler(serializerCompiler);

    app.register(fastifySwagger, {
      openapi: {
        info: {
          title: 'SampleApi',
          description: 'Sample backend service',
          version: '1.0.0',
        },
        servers: [],
      },
      transform: jsonSchemaTransform,
    });

    app.register(fastifySwaggerUI, {
      routePrefix: '/documentation',
    });

    const TOKEN_SCHEMA = v.string([v.maxLength(12)]);

    app.after(() => {
      app.withTypeProvider<ValibotTypeProvider>().route({
        method: 'POST',
        url: '/login',
        schema: {
          body: v.object({
            access_token: TOKEN_SCHEMA,
            refresh_token: TOKEN_SCHEMA,
          }),
        },
        handler: (req, res) => {
          res.send('ok');
        },
      });
    });

    await app.ready();

    const openApiSpecResponse = await app.inject().get('/documentation/json');
    const openApiSpec = JSON.parse(openApiSpecResponse.body);

    expect(openApiSpec).toMatchSnapshot();
    await validator.validate(openApiSpec, {});
  });
});
