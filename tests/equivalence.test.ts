import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema"
import { pipe } from "@effect/data/Function"
import * as _ from "../src/equivalence"
import * as Eq from "@effect/data/typeclass/Equivalence";
import * as fc from 'fast-check'
import * as A from "@effect/schema/Arbitrary";
import { Category } from "./schemas";


/**
 * Tests that the generated Eq is a valid Eq
 */
const generatesValidEq = <I, A>(schema: S.Schema<I, A>) => {
    const arb = A.to(schema)(fc);
    const eq = _.to(schema)()

    const reflexivity = fc.property(arb, a => eq(a, a))
    const symmetry = fc.property(arb, arb, (a, b) => eq(a, b) === eq(b, a))
    const transitivity = fc.property(arb, arb, arb, (a, b, c) => (eq(a, b) && eq(b, c)) === (eq(a, b) && eq(a, c)))

    fc.assert(reflexivity)
    fc.assert(symmetry)
    fc.assert(transitivity)
}

describe("equivalence", () => {

    it("ast", () => {
        const ast = pipe(S.NumberFromString, _.equivalence(Eq.strict())).ast.annotations
        expect(ast).toEqual({
            [_.EquivalenceHookId]: Eq.strict()
        })
    })

    it("number/ ", () => {
        const schema = pipe(S.number, S.nonNaN())
        const eq = _.to(schema)()

        generatesValidEq(schema)
        expect(eq(0,1)).toBe(false)
    })

    it("string/ ", () => {
        const eq = _.to(S.string)();

        generatesValidEq(S.string)
        expect(eq("", " ")).toBe(false)
    });

    it("boolean/ ", () => {
        const eq = _.to(S.boolean)();

        generatesValidEq(S.boolean)
        expect(eq(false, false)).toBe(true)
        expect(eq(true, true)).toBe(true)
        expect(eq(true, false)).toBe(false)
        expect(eq(false, true)).toBe(false)
    });

    it("literal/ ", () => {
        const schema = S.literal("a", "b")
        const eq = _.to(schema)();

        generatesValidEq(schema)
        expect(eq("a", "b")).toBe(false)
    })

    it("struct/ ", () => {
        const schema = pipe(
          S.struct({
            a: S.string,
            b: pipe(S.number, S.nonNaN()),
            c: S.array(pipe(S.number, S.nonNaN())),
            d: S.optional(S.boolean),
            e: S.struct({
              f: S.tuple(pipe(S.number, S.nonNaN()), S.literal("literal"))
            }),
          })
        )

        const eq = _.to(schema)()
    
        const val = { a: "", b: 0, c: [], e: { f: [0, "literal"] } } as const

        generatesValidEq(schema)
        expect(eq(val, {...val, d: true})).toEqual(false)
    })

    it("custom eq", () => {
        const person = S.struct({
            id: S.string,
            a: S.string
        })

        const schema = pipe(person, _.equivalence((a, b) => a.id === b.id))
        const eq = _.to(schema)();

        generatesValidEq(schema)
        expect(eq({ id: "1", a: "a" }, { id: "1", a: "b" })).toEqual(true)
    })


    it("template literal", () => {
        const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
        const eq = _.to(schema)()

        generatesValidEq(schema)
        expect(eq("ab", "axb")).toBe(false)
    })

    it("tuple/ ", () => {
        const schema = pipe(S.tuple(S.string, pipe(S.number, S.nonNaN())), S.rest(S.boolean))
        const eq = _.to(schema)()

        generatesValidEq(schema)
        expect(eq(["", 1, false], ["", 1, true])).toEqual(false)

        expect(eq(["", 1, false, false], ["", 1, false, true])).toEqual(false)
        expect(eq(["", 1], ["", 1, true])).toEqual(false)
    })

    it("void/ ", () => {
        const schema = S.void;
        generatesValidEq(schema)
    })

    it("symbol/ ", () => {
        const schema = S.symbol;
        const eq = _.to(schema)()
        const symbol = Symbol("test")

        generatesValidEq(schema)
        expect(eq(symbol, symbol)).toEqual(true)
    })

    it("any/ ", () => {
        const schema = pipe(S.any, S.nonNaN());
        const eq = _.to(schema)()

        generatesValidEq(schema)
        expect(eq(1, 1)).toEqual(true)
        expect(eq("1", "1")).toEqual(true)
        expect(eq(1, "1")).toEqual(false)
    })

    it("unknown/ ", () => {
        const schema = S.unknown;
        const eq = _.to(schema)()

        generatesValidEq(schema)
        expect(eq(1, 1)).toEqual(true)
        expect(eq("1", "1")).toEqual(true)
    })

    it("transform/ ", () => {
        const schema: S.Schema<string, readonly [string]> = pipe(
          S.string,
          S.transform(
            S.tuple(S.string),
            (s) => [s] as readonly [string],
            ([s]) => s
          )
        );

        const eqTo = _.to(schema)()
        const eqFrom = _.from(schema)()

        generatesValidEq(schema)
        expect(eqTo([""], [" "])).toEqual(false)
        expect(eqTo([" "], [""])).toEqual(false)
        expect(eqFrom(" ", "")).toEqual(false)
    })

    it("record/ ", () => {
        const schema = S.record(S.string, pipe(S.number, S.nonNaN()))
        const eq = _.to(schema)()

        generatesValidEq(schema)
        expect(eq({}, {})).toEqual(true);
        expect(eq({ a: 1 }, { a: 1 })).toEqual(true);
    });

    it("lazy/ ", () => {
        const schema = Category
        const eq = _.to(schema)()

        // generatesValidEq(schema) // In theory works, but causes issues
        expect(eq({ name: "a", subcategories: [] }, { name: "a", subcategories: [] })).toEqual(true)
        expect(eq(
            { name: "a", subcategories: [{ name: "b", subcategories: [] }] }, 
            { name: "a", subcategories: [{ name: "b", subcategories: [] }] })
        ).toEqual(true)
    })

    it("union/ ", () => {
        const schema = S.union(pipe(S.number, S.nonNaN()), S.boolean)
        const eq = _.to(schema)()

        generatesValidEq(schema)
        expect(eq(0, 1)).toEqual(false)
        expect(eq(false, true)).toEqual(false)
        expect(eq(0, true)).toEqual(false)
        expect(eq(1, false)).toEqual(false)
    })

    it("union/ discriminated", () => {
        const schema = S.union(
            S.struct({ type: S.literal("a"), a: S.string }),
            S.struct({ type: S.literal("b"), b: S.number })
        )

        const eq = _.to(schema)()

        generatesValidEq(schema)
        expect(eq({ type: "a", a: "" }, { type: "a", a: "" })).toEqual(true)
        expect(eq({ type: "b", b: 1 }, { type: "b", b: 1 })).toEqual(true)
        expect(eq({ type: "a", a: "" }, { type: "b", b: 1 })).toEqual(false)
    })

})
