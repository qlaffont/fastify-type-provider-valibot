/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ToJSONSchemaOptions } from '@gcornut/valibot-json-schema';
import { toJSONSchema } from '@gcornut/valibot-json-schema';
import type Ajv from 'ajv';
import type { FastifySchema, FastifySchemaCompiler, FastifyTypeProvider } from 'fastify';
import type { FastifySerializerCompiler, FastifyValidationResult } from 'fastify/types/schema';
import { safeParse, parse } from 'valibot';
import type { BaseSchema, Input, AnySchema } from 'valibot';

type FreeformRecord = Record<string, any>;

const defaultSkipList = [
  '/documentation/',
  '/documentation/initOAuth',
  '/documentation/json',
  '/documentation/uiConfig',
  '/documentation/yaml',
  '/documentation/*',
  '/documentation/static/*',
];

export interface ValibotTypeProvider extends FastifyTypeProvider {
  output: this['input'] extends BaseSchema ? Input<this['input']> : never;
}

const toJSONSchemaOptions: ToJSONSchemaOptions = {
  undefinedStrategy: 'any',
};

interface Schema extends FastifySchema {
  hide?: boolean;
}

export const createJsonSchemaTransform = ({ skipList }: { skipList: readonly string[] }) => {
  return ({ schema, url }: { schema: Schema; url: string }) => {
    if (!schema) {
      return {
        schema,
        url,
      };
    }

    const { response, headers, querystring, body, params, hide, ...rest } = schema;

    const transformed: FreeformRecord = {};

    if (skipList.includes(url) || hide) {
      transformed.hide = true;
      return { schema: transformed, url };
    }

    const valibotSchemas: FreeformRecord = { headers, querystring, body, params };

    for (const prop in valibotSchemas) {
      const valibotSchema = valibotSchemas[prop];

      if (valibotSchema && valibotSchema.type && !valibotSchema.properties) {
        transformed[prop] = toJSONSchema({ schema: valibotSchema, ...toJSONSchemaOptions });
      }
    }

    if (response) {
      transformed.response = {};

      for (const prop in response as any) {
        const schema = resolveSchema((response as any)[prop]);

        //@ts-ignore
        if (schema && schema.type && !schema.properties) {
          const transformedResponse = toJSONSchema({ schema: schema, ...toJSONSchemaOptions });
          transformed.response[prop] = transformedResponse;
        }
      }
    }

    for (const prop in rest) {
      const meta = rest[prop as keyof typeof rest];

      if (meta) {
        transformed[prop] = meta;
      }
    }

    return { schema: transformed, url };
  };
};

export const jsonSchemaTransform = createJsonSchemaTransform({
  skipList: defaultSkipList,
});

export const validatorCompiler = (
  ajvInstance?: Ajv,
  fallbackFunction?: (schema: unknown, data: unknown) => FastifyValidationResult,
) =>
  (({ schema }) => {
    //@ts-ignore
    if (schema.type && !schema.properties) {
      return (data) => {
        try {
          parse(schema, data);
          return { value: data };
        } catch (e) {
          return { error: e };
        }
      };
    }

    if (fallbackFunction) {
      return (data) => {
        try {
          return fallbackFunction(schema, data);
        } catch (e) {
          return { error: e };
        }
      };
    }

    if (ajvInstance) {
      return ajvInstance.compile(schema);
    }

    return (data) => {
      return { value: data };
    };
  }) as FastifySchemaCompiler<AnySchema>;

function hasOwnProperty<T, K extends PropertyKey>(obj: T, prop: K): obj is T & Record<K, any> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

//@ts-ignore
function resolveSchema(maybeSchema): AnySchema {
  if (hasOwnProperty(maybeSchema, 'type')) {
    return maybeSchema;
  }
  throw new Error(`Invalid schema passed: ${JSON.stringify(maybeSchema)}`);
}

export class ResponseValidationError extends Error {
  public details: FreeformRecord;

  constructor(validationResult: FreeformRecord) {
    super("Response doesn't match the schema");
    this.name = 'ResponseValidationError';
    this.details = validationResult.error;
  }
}
export const serializerCompiler: FastifySerializerCompiler<BaseSchema> = ({
  schema: maybeSchema,
}) => {
  const schema = resolveSchema(maybeSchema);

  if ((schema as AnySchema).type) {
    return (data) => {
      const result = safeParse(schema, data);

      if (result.success) {
        return JSON.stringify(result.output);
      }

      throw new ResponseValidationError(result);
    };
  }

  return (data) => JSON.stringify(data);
};
