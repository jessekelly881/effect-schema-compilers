import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema"
import { pipe } from "@effect/data/Function"
import * as _ from "../src/semigroup"
import * as Semi from "@effect/data/typeclass/Semigroup"
import * as n from "@effect/data/Number"


describe("semigroup", () => {

    it("ast", () => {
        const s = Semi.numberSum

        const ast = pipe(S.NumberFromString, _.semigroup(s)).ast.annotations
        expect(ast).toEqual({
            [_.SemigroupHookId]: s
        })
    })

    it("number/ ", () => {
        const { combine } = _.semigroupFor(S.number)
        expect(combine(1, 2)).toBe(2)
    })

    it("number/ sum", () => {
        const schema = pipe(S.number, _.semigroup(Semi.numberSum))
        const { combine } = _.semigroupFor(schema)
        expect(combine(1, 2)).toBe(3)
    })

    it("string/ ", () => {
        const { combine } = _.semigroupFor(S.string)
        expect(combine("a", "b")).toBe("b")
    })

    it("string/ concat", () => {
        const schema = pipe(S.string, _.semigroup(Semi.string))
        const { combine } = _.semigroupFor(schema)
        expect(combine("a", "b")).toBe("ab")
    })

    it("tuple/ ", () => {
        const { combine } = _.semigroupFor(S.tuple(S.number, S.number))
        expect(combine([0, 1], [1, 2])).toEqual([1,2])
    })

    it("tuple/ [min, max]", () => {
        const schema = pipe(S.tuple(S.number, S.number), _.semigroup(Semi.tuple(Semi.min(n.Order), Semi.max(n.Order))))
        const { combine } = _.semigroupFor(schema)
        expect(combine([0, 1], [1, 2])).toEqual([0, 2])
    })

    it("struct/ ", () => {
        const schema = S.struct({ a: S.number, b: S.string });
        const { combine } = _.semigroupFor(schema)
        expect(combine({ a: 0, b: "0" }, { a: 1, b: "1" })).toEqual({ a: 1, b: "1" })
    })

    it("boolean/ ", () => {
        const { combine } = _.semigroupFor(S.boolean)
        expect(combine(true, false)).toEqual(false)
    })

    it("boolean/ any", () => {
        const schema = pipe(S.boolean, _.semigroup(Semi.booleanSome))
        const { combine } = _.semigroupFor(schema)
        expect(combine(true, false)).toEqual(true)
    })

    it("struct/ [min, concat]", () => {
        const schema = S.struct({ 
            a: pipe(S.number, _.semigroup(Semi.min(n.Order))), 
            b: pipe(S.string, _.semigroup(Semi.string)),
            c: S.boolean
        });

        const { combine } = _.semigroupFor(schema)
        expect(combine({ a: 0, b: "0", c: true }, { a: 1, b: "1", c: false })).toEqual({ a: 0, b: "01", c: false })
    })

})
