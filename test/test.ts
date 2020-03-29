import * as assert from 'assert';
import * as zod from '../src/index';

type ArgumentsType<T extends (...args: any[]) => any> = T extends (...args: (infer K)[]) => any ? K : any;

const catchError = <T extends (...args: any[]) => any>(fn: T): ((...args: ArgumentsType<T>[]) => Error) => {
  return function(...args) {
    try {
      fn(...args);
      throw new Error('expected function to throw');
    } catch (err) {
      return err;
    }
  };
};

describe('Zod Parsing', () => {
  describe('String parsing', () => {
    const schema = zod.string();

    it('should return valid string', () => {
      const ret = schema.parse('hello world');
      assert.equal(ret, 'hello world');
    });

    it('should throw a ValidationError if not a string', () => {
      const err = catchError(schema.parse.bind(schema))(123);
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, 'expected type to be string but got number');
    });
  });

  describe('boolean parsing', () => {
    const schema = zod.boolean();

    it('should return valid boolean', () => {
      const ret = schema.parse(false);
      assert.equal(ret, false);
    });

    it('should throw a ValidationError if not a boolean', () => {
      const err = catchError(schema.parse.bind(schema))({});
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, 'expected type to be boolean but got object');
    });
  });

  describe('number parsing', () => {
    const schema = zod.number();

    it('should return valid number', () => {
      const ret = schema.parse(321);
      assert.equal(ret, 321);
    });

    it('should throw a ValidationError if not a number', () => {
      const err = catchError(schema.parse.bind(schema))(null);
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, 'expected type to be number but got object');
    });
  });

  describe('undefined parsing', () => {
    const schema = zod.undefined();

    it('should return undefined', () => {
      const ret = schema.parse(undefined);
      assert.equal(ret, undefined);
    });

    it('should throw a ValidationError if not undefined', () => {
      const err = catchError(schema.parse.bind(schema))('hello');
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, 'expected type to be undefined but got string');
    });
  });

  describe('null parsing', () => {
    const schema = zod.null();

    it('should return null', () => {
      const ret = schema.parse(null);
      assert.equal(ret, null);
    });

    it('should throw a ValidationError if not null', () => {
      const err = catchError(schema.parse.bind(schema))(123);
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, 'expected type to be null but got number');
    });
  });

  describe('literal parsing', () => {
    const schema = zod.literal('123');

    it('should return the literal if match', () => {
      const ret = schema.parse('123');
      assert.equal(ret, '123');
    });

    it('should throw a ValidationError if not the same type', () => {
      const err = catchError(schema.parse.bind(schema))(123);
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, `expected value to be literal "123" but got 123`);
    });

    it('should throw validation error if literal is not the same value', () => {
      const err = catchError(schema.parse.bind(schema))('321');
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, `expected value to be literal "123" but got "321"`);
    });
  });

  describe('unknown parsing', () => {
    it('should return the unknown value as is', () => {
      const schema = zod.unknown();
      const ret = schema.parse('hello');
      assert.equal(ret, 'hello');
    });

    it('should force a key to be required within an object schema', () => {
      const schema = zod.object({ required: zod.unknown() });
      const err = catchError(schema.parse.bind(schema))({});
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(
        err.message,
        `error parsing object at path: "required" - expected key "required" of unknown type to be present on object`
      );
    });

    it('should force a key to be required within an object schema even if key value is undefined', () => {
      const schema = zod.object({ required: zod.unknown() });
      const ret = schema.parse({ required: undefined });
      assert.deepEqual(ret, { required: undefined });
      assert.equal(ret.hasOwnProperty('required'), true);
    });
  });

  describe('optional and nullable modifiers', () => {
    const optionalSchema = zod.string().optional();
    const nullableSchema = zod.string().nullable();

    it('should accept undefined as a value when optional schema', () => {
      const ret = optionalSchema.parse(undefined);
      assert.equal(ret, undefined);
    });

    it('should accept null as a value when nullable schema', () => {
      const ret = nullableSchema.parse(null);
      assert.equal(ret, null);
    });

    it('should not allow null when optional schema', () => {
      const err = catchError(optionalSchema.parse.bind(optionalSchema))(null);
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(
        err.message,
        'No union satisfied:\n  expected type to be string but got object\n  expected type to be undefined but got object'
      );
    });

    it('should not allow undefined when nullable schema', () => {
      const err = catchError(nullableSchema.parse.bind(nullableSchema))(undefined);
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(
        err.message,
        'No union satisfied:\n  expected type to be string but got undefined\n  expected type to be null but got undefined'
      );
    });
  });

  describe('object parsing', () => {
    const emptySchema = zod.object({});
    it('should only accept empty object', () => {
      const ret = emptySchema.parse({});
      assert.deepEqual(ret, {});
    });

    it('should fail if value provided is null', () => {
      const err = catchError(emptySchema.parse.bind(emptySchema))(null);
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, 'expected object but got null');
    });

    it('should fail if value provided is an array', () => {
      const err = catchError(emptySchema.parse.bind(emptySchema))([]);
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, 'expected type to be regular object but got array');
    });

    it('should fail if there are unknown keys', () => {
      const err = catchError(emptySchema.parse.bind(emptySchema))({ key: 'unkown', value: 'unknown' });
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, 'unexpected keys on object: ["key","value"]');
    });

    it('should allow unknown keys', () => {
      const ret = emptySchema.parse({ a: 1 }, { allowUnknown: true });
      assert.deepEqual(ret, { a: 1 });
    });

    it('should return object with correct object shape - simple', () => {
      const schema = zod.object({ name: zod.string() });
      const ret = schema.parse({ name: 'Bobby' });
      assert.deepEqual(ret, { name: 'Bobby' });
    });

    it('should allow omitted properties on optional keys but include them in returned object', () => {
      const schema = zod.object({
        name: zod.string(),
        age: zod.number().optional(),
      });
      const ret = schema.parse({ name: 'Bobby Darrin' });
      assert.deepEqual(ret, { name: 'Bobby Darrin', age: undefined });
      assert.equal(ret.hasOwnProperty('age'), true);
    });

    it('should fail if object has wrong shape', () => {
      const schema = zod.object({ name: zod.string() });
      const err = catchError(schema.parse.bind(schema))({ name: 5 });
      assert.equal(err instanceof zod.ValidationError, true);
      assert.equal(err.message, 'error parsing object at path: "name" - expected type to be string but got number');
      assert.equal((err as zod.ValidationError).path, 'name');
    });

    it('should give meaningful error for nested objects errors', () => {
      const schema = zod.object({
        person: zod.object({ name: zod.string() }),
      });

      const topLevelError = catchError(schema.parse.bind(schema))({ person: 5 });
      assert.equal(topLevelError instanceof zod.ValidationError, true);
      assert.equal(
        topLevelError.message,
        'error parsing object at path: "person" - expected type to be object but got number'
      );
      assert.equal((topLevelError as zod.ValidationError).path, 'person');

      const nestedError = catchError(schema.parse.bind(schema))({ person: { name: 5 } });
      assert.equal(nestedError instanceof zod.ValidationError, true);
      assert.equal(
        nestedError.message,
        'error parsing object at path: "person.name" - expected type to be string but got number'
      );
      assert.equal((nestedError as zod.ValidationError).path, 'person.name');
    });
  });
});