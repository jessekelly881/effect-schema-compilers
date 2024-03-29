import * as S from "@effect/schema/Schema";
import * as F from "@faker-js/faker";
import { pipe } from "effect/Function";
import { describe, expect, it } from "vitest";
import * as _ from "../src/faker";
import { Category, Fruits } from "./common";

/**
 * Test a given schema
 */
const schema = <I, A>(name: string, schema: S.Schema<I, A>) => {
	it(name, () => {
		const fake = _.make(schema)(F.faker);
		// @ts-ignore
		S.asserts(schema)(fake);
	});
};

describe("faker", () => {
	schema("literal", S.literal("a", "b"));
	schema("boolean", S.boolean);
	schema("number", S.number);
	schema("bigint", S.bigint);
	schema("string", S.string);
	schema("string/ length", S.string.pipe(S.length(10)));
	schema("string/ min, max", S.string.pipe(S.minLength(30), S.maxLength(50)));
	schema("string/ pattern", pipe(S.string, S.pattern(/hello-[1-5]/)));
	schema("symbol", S.symbol);
	schema("union", S.union(S.number, S.string));
	schema("record", S.record(S.string, S.number));
	schema("enum", S.enums(Fruits));
	schema("array", S.array(S.string));
	schema("array/ itemsCount", pipe(S.array(S.string), S.itemsCount(10)));
	schema("lazy", Category);
	schema("Date", S.Date);
	schema(
		"DateFromSelf",
		S.DateFromSelf.pipe(_.faker((f) => f.date.recent()))
	);

	schema("templateLiteral. a", S.templateLiteral(S.literal("a")));
	schema("templateLiteral. ${string}", S.templateLiteral(S.string));

	schema(
		"templateLiteral. a b",
		S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))
	);

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
			S.string.pipe(
				_.faker((f) => f.string.alpha({ length: { min: 0, max: 10 } }))
			),
			S.literal("b")
		)
	);

	schema("number/ int", S.number.pipe(S.int()));
	schema("number/ (0, 5)", S.number.pipe(S.greaterThan(0), S.lessThan(5)));

	schema(
		"number/ int (0, 5)",
		S.number.pipe(S.int(), S.greaterThan(0), S.lessThan(5))
	);

	schema(
		"number/ int [0, 5]",
		S.number.pipe(
			S.int(),
			S.greaterThanOrEqualTo(0),
			S.lessThanOrEqualTo(5)
		)
	);

	schema(
		"bigint/ (0, 5)",
		S.bigint.pipe(S.greaterThanBigint(0n), S.lessThanBigint(5n))
	);

	schema(
		"record. <a${string}b, number>",
		S.record(
			S.templateLiteral(S.literal("a"), S.string, S.literal("b")),
			S.number
		)
	);

	it("never", () => {
		expect(() => _.make(S.never)(F.faker)).toThrowError(
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

	schema("tuple", S.tuple([S.string, S.number], S.boolean, S.string));

	schema(
		"struct",
		pipe(
			S.struct({
				a: S.string,
				b: S.number,
				c: pipe(S.nonEmptyArray(S.number)),
				d: S.optional(S.boolean)
			})
		)
	);

	schema(
		"struct - partial",
		S.partial(S.struct({ a: S.string, b: S.number }))
	);

	schema(
		"struct - extra props",
		pipe(
			S.struct({ a: S.number, b: S.number }),
			S.extend(S.record(S.string, S.number))
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
			sex: pipe(S.literal("male", "female"))
		});

		F.faker.seed(25);
		const fakeData = _.make(Person)(F.faker);
		expect(fakeData).toEqual({
			name: "Seth Gottlieb",
			age: 36,
			sex: "male"
		});

		F.faker.seed(); // Unset seed for later tests
	});
});
