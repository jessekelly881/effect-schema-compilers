import { AST } from "@effect/schema";
import * as A from "@effect/schema/Arbitrary";
import * as Eq from "@effect/schema/Equivalence";
import * as S from "@effect/schema/Schema";
import * as Semi from "@effect/typeclass/Semigroup";
import * as Boolean from "@effect/typeclass/data/Boolean";
import * as Number from "@effect/typeclass/data/Number";
import * as String from "@effect/typeclass/data/String";
import { pipe } from "effect/Function";
import * as n from "effect/Number";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import * as _ from "../src/semigroup";
import { Category, Fruits } from "./common";

/**
 * Tests that the generated Semigroup for a given Schema is a valid Semigroup
 */
const generatesValidSemigroup = <A, I>(schema: S.Schema<A, I>) => {
	const arb = A.make(schema)(fc);
	const eq = Eq.make(schema);
	const { combine } = _.make(schema)();

	const associativity = fc.property(arb, arb, arb, (a, b, c) =>
		eq(combine(combine(a, b), c), combine(a, combine(b, c)))
	);

	fc.assert(associativity);
};

describe("semigroup", () => {
	it("ast", () => {
		const ast = pipe(S.NumberFromString, _.semigroup(Number.SemigroupSum))
			.ast.annotations;
		expect(ast).toEqual({
			[_.SemigroupHookId]: Number.SemigroupSum,
			[AST.IdentifierAnnotationId]: "NumberFromString"
		});
	});

	it("never", () => {
		expect(() => _.make(S.never)()).toThrowError(
			new Error("cannot build a Semigroup for `never`")
		);
	});

	it("literal/ ", () => {
		const schema = S.literal("a", "b");
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine("a", "b")).toBe("b");
	});

	it("number/ ", () => {
		const schema = pipe(S.number, S.nonNaN());
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine(1, 2)).toBe(2);
	});

	it("number/ min", () => {
		const schema = pipe(
			S.number,
			S.nonNaN(),
			_.semigroup(Semi.min(n.Order))
		);
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine(1, 2)).toBe(1);
	});

	it("string/ ", () => {
		const schema = S.string;
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine("a", "b")).toBe("b");
	});

	it("string/ concat", () => {
		const schema = pipe(S.string, _.semigroup(String.Semigroup));
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine("a", "b")).toBe("ab");
	});

	it("string/ ", () => {
		const schema = S.Date;
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		const now = new Date();
		expect(combine(now, now)).toBe(now);
	});

	it("enum/ ", () => {
		const schema = S.enums(Fruits);
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine(Fruits.Apple, Fruits.Banana)).toBe(Fruits.Banana);
	});

	it("tuple/ e + r + e", () => {
		const schema = pipe(
			S.tuple(S.string),
			S.rest(S.boolean),
			S.element(pipe(S.number, S.nonNaN())),
			S.element(S.boolean)
		);
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine(["0", 0, false], ["1", 1, true])).toEqual([
			"1",
			1,
			true
		]);
		expect(combine(["0", true, 0, false], ["1", 1, true])).toEqual([
			"1",
			1,
			true
		]);
		expect(combine(["0", 0, false], ["1", true, 1, true])).toEqual([
			"1",
			true,
			1,
			true
		]);
		expect(
			combine(
				["0", true, true, true, true, 0, false],
				["1", false, false, 1, true]
			)
		).toEqual(["1", false, false, 1, true]);
	});

	it("tuple/ [min, max]", () => {
		const A = pipe(S.number, S.nonNaN(), _.semigroup(Semi.min(n.Order)));
		const B = pipe(S.number, S.nonNaN(), _.semigroup(Semi.max(n.Order)));

		const schema = S.tuple(A, B);
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine([0, 1], [1, 2])).toEqual([0, 2]);
	});

	it("array/ ", () => {
		const schema = S.array(S.string);
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine(["0", "1"], ["0", "1", "2"])).toEqual(["0", "1", "2"]);
	});

	it("struct/ ", () => {
		const schema = S.struct({
			a: pipe(S.number, S.nonNaN()),
			b: S.string,
			c: S.optional(S.boolean)
		});
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine({ a: 0, b: "0" }, { a: 1, b: "1" })).toEqual({
			a: 1,
			b: "1"
		});
		expect(combine({ a: 0, b: "0", c: true }, { a: 1, b: "1" })).toEqual({
			a: 1,
			b: "1"
		});
		expect(combine({ a: 0, b: "0" }, { a: 1, b: "1", c: true })).toEqual({
			a: 1,
			b: "1",
			c: true
		});
		expect(
			combine({ a: 0, b: "0", c: true }, { a: 1, b: "1", c: false })
		).toEqual({ a: 1, b: "1", c: false });
	});

	it("boolean/ ", () => {
		const schema = S.boolean;
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine(true, false)).toEqual(false);
	});

	it("boolean/ any", () => {
		const schema = pipe(S.boolean, _.semigroup(Boolean.SemigroupSome));
		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(combine(true, false)).toEqual(true);
	});

	it("struct/ [min, concat]", () => {
		const schema = S.struct({
			a: pipe(S.number, S.nonNaN(), _.semigroup(Semi.min(n.Order))),
			b: pipe(S.string, _.semigroup(String.Semigroup)),
			c: S.boolean
		});

		const { combine } = _.make(schema)();

		generatesValidSemigroup(schema);
		expect(
			combine({ a: 0, b: "0", c: true }, { a: 1, b: "1", c: false })
		).toEqual({ a: 0, b: "01", c: false });
	});

	it("lazy", () => {
		const s = _.make(Category)();
		const a: Category = {
			name: "a",
			subcategories: [{ name: "a1", subcategories: [] }]
		};
		const b: Category = { name: "b", subcategories: [] };

		expect(s.combine(a, b)).toEqual({ name: "b", subcategories: [] });
	});
});
