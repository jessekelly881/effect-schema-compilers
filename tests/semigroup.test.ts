import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema"
import { pipe } from "@effect/data/Function"
import * as _ from "../src/semigroup"
import * as Semi from "@effect/data/typeclass/Semigroup"
import * as n from "@effect/data/Number"
import * as fc from 'fast-check'
import * as A from "@effect/schema/Arbitrary";
import { equivalenceFor } from "../src/equivalence"

interface Category {
    readonly name: string;
    readonly subcategories: ReadonlyArray<Category>;
}

const Category: S.Schema<Category> = S.lazy(() =>
    S.struct({
        name: S.string,
        subcategories: S.array(Category),
    })
);

/**
 * Tests that the generated Semigroup for a given Schema is a valid Semigroup
 */
const generatesValidSemigroup = <I, A>(schema: S.Schema<I, A>) => {
    const arb = A.to(schema)(fc);
    const eq = equivalenceFor(schema)
    const { combine } = _.semigroupFor(schema)

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

    it("number/ ", () => {
        const schema = pipe(S.number, S.nonNaN())
        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine(1, 2)).toBe(2)
    })

    it("number/ min", () => {
        const schema = pipe(S.number, S.nonNaN(), _.semigroup(Semi.min(n.Order)))
        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine(1, 2)).toBe(1)
    })

    it("string/ ", () => {
        const schema = S.string
        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine("a", "b")).toBe("b")
    })

    it("string/ concat", () => {
        const schema = pipe(S.string, _.semigroup(Semi.string))
        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine("a", "b")).toBe("ab")
    })

    it("tuple/ ", () => {
        const schema = S.tuple(S.string, S.string)
        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine(["0", "1"], ["1", "2"])).toEqual(["1", "2"])
    })

    it("tuple/ [min, max]", () => {
        const schema = pipe(
            S.tuple(pipe(S.number, S.nonNaN()), pipe(S.number, S.nonNaN())), 
            _.semigroup(Semi.tuple(Semi.min(n.Order), Semi.max(n.Order)))
        )

        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine([0, 1], [1, 2])).toEqual([0, 2])
    })

    it("struct/ ", () => {
        const schema = S.struct({ a: pipe(S.number, S.nonNaN()), b: S.string, c: S.optional(S.boolean) });
        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine({ a: 0, b: "0" }, { a: 1, b: "1" })).toEqual({ a: 1, b: "1" })
        expect(combine({ a: 0, b: "0", c: true }, { a: 1, b: "1" })).toEqual({ a: 1, b: "1" })
        expect(combine({ a: 0, b: "0" }, { a: 1, b: "1", c: true })).toEqual({ a: 1, b: "1", c: true })
        expect(combine({ a: 0, b: "0", c: true }, { a: 1, b: "1", c: false })).toEqual({ a: 1, b: "1", c: false })
    })

    it("boolean/ ", () => {
        const schema = S.boolean
        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine(true, false)).toEqual(false)
    })

    it("boolean/ any", () => {
        const schema = pipe(S.boolean, _.semigroup(Semi.booleanSome))
        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine(true, false)).toEqual(true)
    })

    it("struct/ [min, concat]", () => {
        const schema = S.struct({ 
            a: pipe(S.number, S.nonNaN(), _.semigroup(Semi.min(n.Order))), 
            b: pipe(S.string, _.semigroup(Semi.string)),
            c: S.boolean
        });

        const { combine } = _.semigroupFor(schema)

        generatesValidSemigroup(schema)
        expect(combine({ a: 0, b: "0", c: true }, { a: 1, b: "1", c: false })).toEqual({ a: 0, b: "01", c: false })
    })

    it("lazy", () => {
        const { combine } = _.semigroupFor(Category)
        const a: Category = { name: "a", subcategories: [{ name: "a1", subcategories: [] }] }
        const b: Category = { name: "b", subcategories: [] }

        expect(combine(a, b)).toEqual({ name: "b", subcategories: [] })
    })

})