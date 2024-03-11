import { AST } from "@effect/schema";
import * as S from "@effect/schema/Schema";
import { pipe } from "effect/Function";
import { describe, expect, it } from "vitest";
import * as _ from "../src/empty";
import { Category, Fruits } from "./common";

const expectEmptyValue = <A, I>(schema: S.Schema<A, I>, value: A) => {
	const computed = _.make(schema)();
	expect(computed).toEqual(value);
};

describe("empty", () => {
	it("void", () => expectEmptyValue(S.void, undefined));
	it("any", () => expectEmptyValue(S.any, undefined));
	it("unknown", () => expectEmptyValue(S.unknown, undefined));
	it("number", () => expectEmptyValue(S.number, 0));
	it("bigint", () => expectEmptyValue(S.bigint, 0n));
	it("string", () => expectEmptyValue(S.string, ""));
	it("boolean", () => expectEmptyValue(S.boolean, false));
	it("enum", () => expectEmptyValue(S.enums(Fruits), Fruits.Apple));
	it("literal", () => expectEmptyValue(S.literal("a", "b"), "a"));
	it("record", () => expectEmptyValue(S.record(S.string, S.number), {}));
	it("array", () => expectEmptyValue(S.array(S.string), []));
	it("nonEmptyArray", () =>
		expectEmptyValue(S.nonEmptyArray(S.string), [""]));
	it("object", () => expectEmptyValue(S.object, {}));

	it("templateLiteral. a", () =>
		expectEmptyValue(S.templateLiteral(S.literal("a")), "a"));
	it("templateLiteral. ${string}", () =>
		expectEmptyValue(S.templateLiteral(S.string), ""));
	it("templateLiteral. a${string}", () =>
		expectEmptyValue(S.templateLiteral(S.literal("a"), S.string), "a"));
	it("templateLiteral. a${string}b", () =>
		expectEmptyValue(
			S.templateLiteral(S.literal("a"), S.string, S.literal("b")),
			"ab"
		));

	// filters
	it("number/ greaterThan", () =>
		expectEmptyValue(pipe(S.number, S.greaterThan(4)), 4));
	it("number/ greaterThanOrEqualTo", () =>
		expectEmptyValue(pipe(S.number, S.greaterThanOrEqualTo(4)), 4));
	it("number/ int, greaterThan", () =>
		expectEmptyValue(pipe(S.number, S.int(), S.greaterThan(4)), 5));
	it("bigint/ greaterThan", () =>
		expectEmptyValue(pipe(S.bigint, S.greaterThanBigint(4n)), 5n));
	it("bigint/ greaterThanOrEqualTo", () =>
		expectEmptyValue(pipe(S.bigint, S.greaterThanOrEqualToBigint(4n)), 4n));
	it("string/ minLength", () =>
		expectEmptyValue(pipe(S.string, S.minLength(2)), "  "));
	it("array/ minItems", () =>
		expectEmptyValue(pipe(S.array(S.string), S.minItems(2)), ["", ""]));

	it("ast", () => {
		const fn = () => "";
		const ast = pipe(S.NumberFromString, _.empty(fn)).ast.annotations;
		expect(ast).toEqual({
			[AST.IdentifierAnnotationId]: "NumberFromString",
			[_.EmptyHookId]: fn
		});
	});

	it("never", () => {
		expect(() => _.make(S.never)()).toThrowError(
			new Error("cannot build an Empty for `never`")
		);
	});

	it("custom", () => {
		const schema = pipe(
			S.number,
			_.empty(() => 1)
		);
		expectEmptyValue(schema, 1);
	});

	it("transform", () => {
		const schema = S.transform(
			S.string,
			S.tuple(S.string),
			(s) => [s] as readonly string[],
			([s]) => s,
			{ strict: false }
		);

		expectEmptyValue(schema, [""]);
	});

	it("uniqueSymbol", () => {
		const a = Symbol.for("test/a");
		const schema = S.uniqueSymbol(a);
		const emptyTo = _.make(schema)();

		expect(emptyTo.toString()).toEqual(a.toString());
	});

	it("tuple/ e + r", () => {
		const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean));
		expectEmptyValue(schema, ["", 0]);
	});

	it("tuple. e + e?", () => {
		const schema = pipe(S.tuple(S.string), S.optionalElement(S.number));
		expectEmptyValue(schema, [""]);
	});

	it("tuple. e? + r", () => {
		const schema = pipe(
			S.tuple(),
			S.optionalElement(S.string),
			S.rest(S.number)
		);
		expectEmptyValue(schema, []);
	});

	it("tuple/ e + r + e", () => {
		const schema = pipe(
			S.tuple(S.string, S.number),
			S.rest(S.boolean),
			S.element(S.string)
		);
		expectEmptyValue(schema, ["", 0, ""]);
	});

	it("struct", () => {
		const schema = pipe(
			S.struct({
				a: S.string,
				b: S.number,
				c: S.array(S.number),
				d: S.optional(S.boolean),
				e: S.struct({
					f: S.tuple(S.number, S.literal("literal"))
				}),
				g: pipe(
					S.string,
					_.empty(() => "/")
				)
			})
		);
		const empty = _.make(schema)();

		expect(empty).toEqual({
			a: "",
			b: 0,
			c: [],
			e: { f: [0, "literal"] },
			g: "/"
		});
	});

	it("struct - partial", () => {
		const schema = S.partial(S.struct({ a: S.string, b: S.number }));
		expectEmptyValue(schema, {});
	});

	it("union - discriminated", () => {
		const schema = S.union(
			S.struct({ type: S.literal("a"), a: S.string }),
			S.struct({ type: S.literal("b"), b: S.number })
		);

		expectEmptyValue(schema, { type: "a", a: "" });
	});

	it("symbol", () => {
		const schema = S.symbol;
		const empty = _.make(schema)();

		expect(empty.toString()).toEqual(Symbol().toString());
	});

	it("lazy", () => {
		const schema = Category;
		const empty = _.make(schema)();

		expect(empty).toEqual({ name: "", subcategories: [] });
	});
});
