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

    expect(Eq.to(schema)()(computedTo, emptyTo)).to.be.true
    expect(Eq.from(schema)()(computedFrom, emptyFrom)).to.be.true

}

describe("empty", () => {

    it("ast", () => {
        const fn = () => 0
        const ast = pipe(S.NumberFromString, _.empty(fn)).ast.annotations
        expect(ast).toEqual({
            [_.EmptyHookId]: fn
        })
    })

    it("custom empty", () => {
        const schema = pipe(S.number, _.empty(() => 1))
        const empty = _.to(schema)();
        expect(empty).toBe(1)
    })

    it("number", () => {
        const schema = S.number
        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(empty).toBe(0)
    })

    it("string", () => {
        const schema = S.string
        const empty = _.to(schema)();

        testBidirectionality(schema)
        expect(empty).toBe("");
    });

    it("boolean", () => {
        const schema = S.boolean
        const empty = _.to(schema)();

        testBidirectionality(schema)
        expect(empty).toBe(false);
    });

    it("enum", () => {
        const schema = S.enums(Fruits)
        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(S.is(schema)(empty)).to.be.true
        expect(empty).toBe(Fruits.Apple)
    })

    it("transform", () => {
        const schema: S.Schema<string, readonly [string]> = pipe(
            S.string,
            S.transform(S.tuple(S.string), (s) => [s] as readonly string[], ([s]) => s))

        const emptyFrom = _.from(schema)()
        const emptyTo = _.to(schema)()

        testBidirectionality(schema)
        expect(emptyFrom).toEqual("")
        expect(emptyTo).toEqual([""])
    })

    it("tuple/ e + r", () => {
        const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean))
        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(empty).toEqual(["", 0])
    })

    it("tuple/ e + r + e", () => {
        const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean), S.element(S.string))
        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(S.is(schema)(empty)).to.be.true
        expect(empty).toEqual(["", 0, ""])
    })

    it("literal", () => {
        const schema = S.literal("a", "b");
        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(empty).toBe("a")
    })

    it("record", () => {
        const schema = S.record(S.string, S.number)
        const empty = _.to(schema)();

        testBidirectionality(schema)
        expect(empty).toEqual({});
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
            g: pipe(S.string, _.empty(() => '/'))
          })
        )
        const empty = _.to(schema)()
    
        testBidirectionality(schema)
        expect(empty).toEqual({ a: "", b: 0, c: [], e: { f: [0, "literal"] }, g: "/" })
    })
    
    it("struct - partial", () => {
        const schema = S.partial(S.struct({ a: S.string, b: S.number }))
        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(empty).toEqual({})
    })

    it("union - discriminated", () => {
        const schema = S.union(
          S.struct({ type: S.literal("a"), a: S.string }),
          S.struct({ type: S.literal("b"), b: S.number })
        );

        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(empty).toEqual({ type: "a", a: "" })
    })

    it("template literal", () => {
        const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(empty).toBe("ab")
    })

    it("void", () => {
        const empty = _.to(S.void)()
        expect(empty).toBeUndefined()
    })

    it("symbol", () => {
        const schema = S.symbol
        const empty = _.to(schema)()

        // testBidirectionality(schema) // symbol eq is by ref not value so testing for eq doesn't work
        expect(empty.toString()).toEqual(Symbol().toString())
    })

    it("any", () => {
        const empty = _.to(S.any)()
        expect(empty).toBeUndefined()
    })

    it("unknown", () => {
        const empty = _.to(S.undefined)()
        expect(empty).toBeUndefined()
    })

    it("lazy", () => {
        const schema = Category
        const empty = _.to(schema)()

        testBidirectionality(schema)
        expect(empty).toEqual({ name: "", subcategories: [] })
    })
})
