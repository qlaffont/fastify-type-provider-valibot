# Fastify Type Provider Valibot

[![NPM Version](https://img.shields.io/npm/v/fastify-type-provider-valibot.svg)](https://npmjs.org/package/fastify-type-provider-valibot)
[![NPM Downloads](https://img.shields.io/npm/dm/fastify-type-provider-valibot.svg)](https://npmjs.org/package/fastify-type-provider-valibot)
[![Build Status](https://github.com//qlaffont/fastify-type-provider-valibot/workflows/CI/badge.svg)](https://github.com//qlaffont/fastify-type-provider-valibot/actions)

## How to use?

```bash
pnpm install fastify-type-provider-valibot valibot
```

```js
import Fastify from "fastify";
import { serializerCompiler, validatorCompiler, ValibotTypeProvider } from "fastify-type-provider-valibot";
import * as v from "valibot";

const app = Fastify()

// Add schema validator and serializer
app.setSerializerCompiler(serializerCompiler);

//validatorCompiler(ajvInstance?, fallbackFunction?)
//First Argument : You can pass an AJV Instance to validate schema by AJV
//Second Argument : 
//You can precise a function to handle the case where schema is not from Valibot.
//The function should respect :  (schema: unknown, data: unknown) => FastifyValidationResult
app.setValidatorCompiler(validatorCompiler()); 

app.withTypeProvider<ValibotTypeProvider>().route({
  method: "GET",
  url: "/",
  // Define your schema
  schema: {
    querystring: v.object({
      name: v.string(),
    }),
    response: {
      200: v.undefined_('test'),
    },
  },
  handler: (req, res) => {
    res.send(req.query.name);
  },
});

app.listen({ port: 4949 });
```

## How to use together with @fastify/swagger

```ts
import fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';
import * as v from 'valibot';

import {
  jsonSchemaTransform,
  createJsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ValibotTypeProvider,
} from 'fastify-type-provider-valibot';

const app = fastify();
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
  // You can also create transform with custom skiplist of endpoints that should not be included in the specification:
  //
  // transform: createJsonSchemaTransform({
  //   skipList: [ '/documentation/static/*' ]
  // })
  // and you can override default ToJSONSchema options : https://github.com/gcornut/valibot-json-schema/blob/main/src/toJSONSchema/types.ts#L25
  //
  // transform: createJsonSchemaTransform({
  //   toJSONSchemaOptions: { ignoreUnknownValidation: true }
  // })
});

app.register(fastifySwaggerUI, {
  routePrefix: '/documentation',
});

const LOGIN_SCHEMA = v.object({
  username: v.string(),
  password: v.string(),
});

app.after(() => {
  app.withTypeProvider<ValibotTypeProvider>().route({
    method: 'POST',
    url: '/login',
    schema: { body: LOGIN_SCHEMA },
    handler: (req, res) => {
      res.send('ok');
    },
  });
});

async function run() {
  await app.ready();

  await app.listen({
    port: 4949,
  });

  console.log(`Documentation running at http://localhost:4949/documentation`);
}

run();
```
