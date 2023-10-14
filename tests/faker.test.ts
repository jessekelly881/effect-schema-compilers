import { describe, expect, it } from "vitest";
import * as S from "@effect/schema/Schema";
import * as _ from "../src/faker";
import * as F from "@faker-js/faker";
import { pipe } from "effect/Function";
import { Category, Fruits } from "./common";

/**
 * Test a given schema
 */
const schema = <I, A>(name: string, schema: S.Schema<I, A>) => {
  it(name, () => {
    const fake = _.to(schema)(F.faker);
    const isValid = S.is(schema)(fake);
    if (!isValid) console.log(fake);

    expect(isValid).to.be.true;
  });
};

describe("faker", () => {
  schema("literal", S.literal("a", "b"));
  schema("boolean", S.boolean);
  schema("number", S.number);
  schema("bigint", S.bigint);
  schema("string", S.string);
  schema("symbol", S.symbol);
  schema("union", S.union(S.number, S.string));
  schema("record", S.record(S.string, S.number));
  schema("enum", S.enums(Fruits));
  schema("array", S.array(S.string));
  schema("array/ itemsCount", pipe(S.array(S.string), S.itemsCount(10)));
  schema("lazy", Category);
  schema("Date", S.Date);
  schema("DateFromSelf", S.DateFromSelf);

  schema("templateLiteral. a", S.templateLiteral(S.literal("a")));

  schema(
    "templateLiteral. a b",
    S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
  );

  schema("templateLiteral. ${string}", S.templateLiteral(S.string));

  schema(
    "templateLiteral. a${string}",
    S.templateLiteral(S.literal("a"), S.string)
  );
  schema(
    "templateLiteral. a${string}b",
    S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
  );

  schema(
    "templateLiteral. a${string*}b",
    S.templateLiteral(
      S.literal("a"),
      pipe(
        S.string,
        _.faker((f) => f.string.alpha({ length: { min: 0, max: 10 } }))
      ),
      S.literal("b")
    )
  );

  // filters

  schema("number/ int", pipe(S.number, S.int()));
  schema("number/ (0, 5)", pipe(S.number, S.greaterThan(0), S.lessThan(5)));

  schema(
    "number/ int (0, 5)",
    pipe(S.number, S.int(), S.greaterThan(0), S.lessThan(5))
  );

  schema(
    "number/ int [0, 5]",
    S.number.pipe(S.int(), S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(5))
  );

  schema(
    "bigint/ (0, 5)",
    S.bigint.pipe(S.greaterThanBigint(0n), S.lessThanBigint(5n))
  );

  schema("string/ length", S.string.pipe(S.length(10)));

  schema(
    "string/ minLength, maxLength",
    pipe(S.string, S.minLength(30), S.maxLength(50))
  );

  schema("string/ pattern", pipe(S.string, S.pattern(/hello-[1-5]/)));

  schema(
    "record. <a${string}b, number>",
    S.record(
      S.templateLiteral(S.literal("a"), S.string, S.literal("b")),
      S.number
    )
  );

  it("never", () => {
    expect(() => _.to(S.never)(F.faker)).toThrowError(
      new Error("cannot build a Faker for `never`")
    );
  });

  schema(
    "transform",
    pipe(
      S.string,
      S.transform(
        S.tuple(S.string),
        (s) => [s] as readonly [string],
        ([s]) => s
      )
    )
  );

  schema(
    "tuple",
    pipe(S.tuple(S.string, S.number), S.rest(S.boolean), S.element(S.string))
  );

  schema(
    "struct",
    pipe(
      S.struct({
        a: S.string,
        b: S.number,
        c: pipe(S.nonEmptyArray(S.number)),
        d: S.optional(S.boolean),
      })
    )
  );

  schema("struct - partial", S.partial(S.struct({ a: S.string, b: S.number })));

  schema(
    "struct - extra props",
    pipe(
      S.struct({ a: S.symbol, b: S.number }),
      S.extend(S.record(S.string, S.string))
    )
  );

  it("example", () => {
    const Person = S.struct({
      name: pipe(
        S.string,
        _.faker((f) => f.person.fullName())
      ),
      age: pipe(
        S.number,
        S.int(),
        S.greaterThanOrEqualTo(18),
        S.lessThanOrEqualTo(120)
      ),
      sex: pipe(S.literal("male", "female")),
    });

    F.faker.seed(25);
    const fakeData = _.to(Person)(F.faker);
    expect(fakeData).toEqual({ name: "Seth Gottlieb", age: 36, sex: "male" });

    F.faker.seed(); // Unset seed for later tests
  });
});
