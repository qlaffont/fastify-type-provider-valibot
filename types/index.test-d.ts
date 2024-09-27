import type {
  FastifyInstance,
  FastifyLoggerInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from 'fastify';
import Fastify from 'fastify';
import { expectAssignable, expectType } from 'tsd';
import * as v from 'valibot';

import { serializerCompiler, validatorCompiler } from '../src/index';
import type { ValibotTypeProvider } from '../src/index';

const fastify = Fastify().withTypeProvider<ValibotTypeProvider>();

type FastifyValibotInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyLoggerInstance,
  ValibotTypeProvider
>;

expectType<FastifyValibotInstance>(fastify.setValidatorCompiler(validatorCompiler()));
expectType<FastifyValibotInstance>(fastify.setSerializerCompiler(serializerCompiler));
expectAssignable<FastifyValibotInstance>(fastify);

fastify.route({
  method: 'GET',
  url: '/',
  // Define your schema
  schema: {
    querystring: v.object({
      name: v.pipe(v.string(), v.minLength(4)),
    }),
    response: {
      200: v.string(),
    },
  },
  handler: (req, res) => {
    //@ts-ignore
    // expectType<string>(req.query.name);
    res.send('string');
  },
});
