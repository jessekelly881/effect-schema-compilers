import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema"
import { pipe } from "@effect/data/Function"
import * as _ from "../src/empty"
import * as Eq from "../src/equivalence"
import * as fc from 'fast-check'
import * as A from "@effect/schema/Arbitrary";
import { Category, Fruits } from "./common";

/**
 * Tests that 
 * 1) decode(empty(from(schema))) == empty(to(schema))
 * 2) empty(from(schema)) == encode(empty(to(schema)))
 */
const testBidirectionality = <I, A>(schema: S.Schema<I, A>) => {
    const emptyTo = _.to(schema)();
    const emptyFrom = _.from(schema)();
    const computedTo = S.decode(schema)(emptyFrom)
    const computedFrom = S.encode(schema)(emptyTo)

    expect(computedTo).toEqual(emptyTo)
    expect(computedFrom).toEqual(emptyFrom)
}

const expectEmptyValues = <A, I>(schema: S.Schema<I, A>, from: I, to: A) => {
    const emptyTo = _.to(schema)();
    const emptyFrom = _.from(schema)();

    expect(emptyTo).toEqual(to),
    expect(emptyFrom).toEqual(from)
}

describe("empty", () => {

    it("void", () => expectEmptyValues(S.void, undefined, undefined))
    it("any", () => expectEmptyValues(S.any, undefined, undefined))
    it("unknown", () => expectEmptyValues(S.unknown, undefined, undefined))
    it("number", () => expectEmptyValues(S.number, 0, 0))
    it("bigint", () => expectEmptyValues(S.bigint, 0n, 0n))
    it("string", () => expectEmptyValues(S.string, "", ""));
    it("boolean", () => expectEmptyValues(S.boolean, false, false));
    it("enum", () => expectEmptyValues(S.enums(Fruits), Fruits.Apple, Fruits.Apple))
    it("literal", () => expectEmptyValues(S.literal("a", "b"), "a", "a"))
    it("record", () => expectEmptyValues(S.record(S.string, S.number) , {}, {}));
    it("array", () => expectEmptyValues(S.array(S.string) , [], []));
    it("nonEmptyArray", () => expectEmptyValues(S.nonEmptyArray(S.string) , [""], [""]));
    it("object", () => expectEmptyValues(S.object , {}, {}));

    it("templateLiteral. a", () => expectEmptyValues(S.templateLiteral(S.literal("a")) , "a", "a"))
    it("templateLiteral. ${string}", () => expectEmptyValues(S.templateLiteral(S.string) , "", ""))
    it("templateLiteral. a${string}", () => expectEmptyValues(S.templateLiteral(S.literal("a"), S.string) , "a", "a"))
    it("templateLiteral. a${string}b", () => expectEmptyValues(S.templateLiteral(S.literal("a"), S.string, S.literal("b")) , "ab", "ab"))

    // filters
    it("number/ greaterThan", () => expectEmptyValues(pipe(S.number, S.greaterThan(4)), 0, 4))
    it("number/ greaterThanOrEqualTo", () => expectEmptyValues(pipe(S.number, S.greaterThanOrEqualTo(4)), 0, 4))
    it("number/ int, greaterThan", () => expectEmptyValues(pipe(S.number, S.int(), S.greaterThan(4)), 0, 5))
    it("bigint/ greaterThan", () => expectEmptyValues(pipe(S.bigint, S.greaterThanBigint(4n)), 0n, 5n))
    it("bigint/ greaterThanOrEqualTo", () => expectEmptyValues(pipe(S.bigint, S.greaterThanOrEqualToBigint(4n)), 0n, 4n))
    it("string/ minLength", () => expectEmptyValues(pipe(S.string, S.minLength(2)), "", "  "))

    it("ast", () => {
        const fn = () => 0
        const ast = pipe(S.NumberFromString, _.empty(fn)).ast.annotations
        expect(ast).toEqual({
            [_.EmptyHookId]: fn
        })
    })

    it("never", () => {
        expect(() => _.to(S.never)()).toThrowError(
            new Error("cannot build an Empty for `never`")
        );
    });

    it("custom", () => {
        const schema = pipe(S.number, _.empty(() => 1))
        expectEmptyValues(schema, 1, 1)
    })

    it("transform", () => {
        const schema: S.Schema<string, readonly [string]> = pipe(
            S.string,
            S.transform(S.tuple(S.string), (s) => [s] as readonly string[], ([s]) => s))

        testBidirectionality(schema)
        expectEmptyValues(schema, "", [""])
    })

    it("uniqueSymbol", () => {
        const a = Symbol.for("test/a")
        const schema = S.uniqueSymbol(a)
        const emptyTo = _.to(schema)();

        expect(emptyTo.toString()).toEqual(a.toString())
    })

    it("tuple/ e + r", () => {
        const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean))
        expectEmptyValues(schema, ["", 0], ["", 0])
    })

    it("tuple. e + e?", () => {
        const schema = pipe(S.tuple(S.string), S.optionalElement(S.number))
        expectEmptyValues(schema, [""], [""])
    })

    it("tuple. e? + r", () => {
        const schema = pipe(S.tuple(), S.optionalElement(S.string), S.rest(S.number))
        expectEmptyValues(schema, [], [])
    })

    it("tuple/ e + r + e", () => {
        const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean), S.element(S.string))
        expectEmptyValues(schema, ["", 0, ""], ["", 0, ""])
    })

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
            g: pipe(S.string, _.empty(() => '/'))
          })
        )
        const empty = _.to(schema)()
    
        testBidirectionality(schema)
        expect(empty).toEqual({ a: "", b: 0, c: [], e: { f: [0, "literal"] }, g: "/" })
    })
    
    it("struct - partial", () => {
        const schema = S.partial(S.struct({ a: S.string, b: S.number }))
        expectEmptyValues(schema , {}, {})
    })

    it("union - discriminated", () => {
        const schema = S.union(
          S.struct({ type: S.literal("a"), a: S.string }),
          S.struct({ type: S.literal("b"), b: S.number })
        );

        expectEmptyValues(schema , { type: "a", a: "" }, { type: "a", a: "" })
    })

    it("symbol", () => {
        const schema = S.symbol
        const empty = _.to(schema)()

        expect(empty.toString()).toEqual(Symbol().toString())
    })

    it("lazy", () => {
        const schema = Category
        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(empty).toEqual({ name: "", subcategories: [] })
    })
})
