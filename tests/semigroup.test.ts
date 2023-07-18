import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema"
import { pipe } from "@effect/data/Function"
import * as _ from "../src/semigroup"
import * as Semi from "@effect/typeclass/Semigroup"
import * as n from "@effect/data/Number"
import * as fc from 'fast-check'
import * as A from "@effect/schema/Arbitrary";
import { to } from "../src/equivalence"
import { Category, Fruits } from "./common";

/**
 * Tests that the generated Semigroup for a given Schema is a valid Semigroup
 */
const generatesValidSemigroup = <I, A>(schema: S.Schema<I, A>) => {
    const arb = A.to(schema)(fc);
    const eq = to(schema)()
    const { combine } = _.to(schema)()

    const associativity = fc.property(arb, arb, arb, (a, b, c) => 
        eq(combine(combine(a, b), c), combine(a, combine(b, c)))
    ) 

    fc.assert(associativity)
}

describe("semigroup", () => {

    it("ast", () => {
        const s = Semi.numberSum

        const ast = pipe(S.NumberFromString, _.semigroup(s)).ast.annotations
        expect(ast).toEqual({
            [_.SemigroupHookId]: s
        })
    })

    it("never", () => {
        expect(() => _.to(S.never)()).toThrowError(
            new Error("cannot build a Semigroup for `never`")
        );
    });

    it("literal/ ", () => {
        const schema = S.literal("a", "b")
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine("a", "b")).toBe("b")
    })

    it("number/ ", () => {
        const schema = pipe(S.number, S.nonNaN())
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine(1, 2)).toBe(2)
    })

    it("number/ min", () => {
        const schema = pipe(S.number, S.nonNaN(), _.semigroup(Semi.min(n.Order)))
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine(1, 2)).toBe(1)
    })

    it("string/ ", () => {
        const schema = S.string
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine("a", "b")).toBe("b")
    })

    it("string/ concat", () => {
        const schema = pipe(S.string, _.semigroup(Semi.string))
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine("a", "b")).toBe("ab")
    })

    it("enum/ ", () => {
        const schema = S.enums(Fruits)
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine(Fruits.Apple, Fruits.Banana)).toBe(Fruits.Banana)
    })

    it("tuple/ e + r + e", () => {
        const schema = pipe(S.tuple(S.string), S.rest(S.boolean), S.element(pipe(S.number, S.nonNaN())), S.element(S.boolean))
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine(["0", 0, false], ["1", 1, true])).toEqual(["1", 1, true])
        expect(combine(["0", true, 0, false], ["1", 1, true])).toEqual(["1", 1, true])
        expect(combine(["0", 0, false], ["1", true, 1, true])).toEqual(["1", true, 1, true])
        expect(combine(["0", true, true, true, true, 0, false], ["1", false, false, 1, true])).toEqual(["1", false, false, 1, true])
    })

    it("tuple/ [min, max]", () => {
        const A = pipe(S.number, S.nonNaN(), _.semigroup(Semi.min(n.Order))) 
        const B = pipe(S.number, S.nonNaN(), _.semigroup(Semi.max(n.Order)))

        const schema = S.tuple(A, B) 
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine([0, 1], [1, 2])).toEqual([0, 2])
    })

    it("array/ ", () => {
        const schema = S.array(S.string);
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine(["0", "1"], ["0", "1", "2"])).toEqual(["0", "1", "2"])
    })

    it("struct/ ", () => {
        const schema = S.struct({ a: pipe(S.number, S.nonNaN()), b: S.string, c: S.optional(S.boolean) });
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine({ a: 0, b: "0" }, { a: 1, b: "1" })).toEqual({ a: 1, b: "1" })
        expect(combine({ a: 0, b: "0", c: true }, { a: 1, b: "1" })).toEqual({ a: 1, b: "1" })
        expect(combine({ a: 0, b: "0" }, { a: 1, b: "1", c: true })).toEqual({ a: 1, b: "1", c: true })
        expect(combine({ a: 0, b: "0", c: true }, { a: 1, b: "1", c: false })).toEqual({ a: 1, b: "1", c: false })
    })

    it("boolean/ ", () => {
        const schema = S.boolean
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine(true, false)).toEqual(false)
    })

    it("boolean/ any", () => {
        const schema = pipe(S.boolean, _.semigroup(Semi.booleanSome))
        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine(true, false)).toEqual(true)
    })

    it("struct/ [min, concat]", () => {
        const schema = S.struct({ 
            a: pipe(S.number, S.nonNaN(), _.semigroup(Semi.min(n.Order))), 
            b: pipe(S.string, _.semigroup(Semi.string)),
            c: S.boolean
        });

        const { combine } = _.to(schema)()

        generatesValidSemigroup(schema)
        expect(combine({ a: 0, b: "0", c: true }, { a: 1, b: "1", c: false })).toEqual({ a: 0, b: "01", c: false })
    })

    it("lazy", () => {
        const { combine } = _.to(Category)()
        const a: Category = { name: "a", subcategories: [{ name: "a1", subcategories: [] }] }
        const b: Category = { name: "b", subcategories: [] }

        expect(combine(a, b)).toEqual({ name: "b", subcategories: [] })
    })

})
