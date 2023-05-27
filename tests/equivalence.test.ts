import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema"
import { pipe } from "@effect/data/Function"
import * as _ from "../src/equivalence"
import * as Eq from "@effect/data/typeclass/Equivalence";
import * as fc from 'fast-check'
import * as A from "@effect/schema/Arbitrary";

/**
 * Tests that the generated Eq is a valid Eq
 */
const generatesValidEq = <I, A>(schema: S.Schema<I, A>) => {
    const arb = A.to(schema)(fc);
    const eq = _.equivalenceFor(schema)

    const reflexivity = fc.property(arb, a => eq(a, a))
    const symmetry = fc.property(arb, arb, (a, b) => eq(a, b) === eq(b, a))
    const transitivity = fc.property(arb, arb, arb, (a, b, c) => (eq(a, b) && eq(b, c)) === (eq(a, b) && eq(a, c)))

    fc.assert(reflexivity)
    fc.assert(symmetry)
    fc.assert(transitivity)
}



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

describe("empty", () => {

    it("ast", () => {
        const ast = pipe(S.NumberFromString, _.equivalence(Eq.strict())).ast.annotations
        expect(ast).toEqual({
            [_.EquivalenceHookId]: Eq.strict()
        })
    })

    it("number", () => {
        const schema = pipe(S.number, S.nonNaN())
        const eq = _.equivalenceFor(schema)

        generatesValidEq(schema)
        expect(eq(0,1)).toBe(false)
    })

    it("string", () => {
        const eq = _.equivalenceFor(S.string);

        generatesValidEq(S.string)
        expect(eq("", " ")).toBe(false)
    });

    it("boolean", () => {
        const eq = _.equivalenceFor(S.boolean);

        generatesValidEq(S.boolean)
        expect(eq(true, false)).toBe(false)
    });

    it("literal", () => {
        const schema = S.literal("a", "b")
        const eq = _.equivalenceFor(schema);

        generatesValidEq(schema)
        expect(eq("a", "b")).toBe(false)
    })

    it("struct", () => {
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

        const eq = _.equivalenceFor(schema)
    
        const val = { a: "", b: 0, c: [], e: { f: [0, "literal"] } } as const

        generatesValidEq(schema)
        expect(eq(val, {...val, d: true})).toEqual(false)
    })

    it("template literal", () => {
        const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
        const eq = _.equivalenceFor(schema)

        generatesValidEq(schema)
        expect(eq("ab", "axb")).toBe(false)
    })

    it("tuple", () => {
        const schema = pipe(S.tuple(S.string, pipe(S.number, S.nonNaN())), S.rest(S.boolean))
        const eq = _.equivalenceFor(schema)

        generatesValidEq(schema)
        expect(eq(["", 1, false], ["", 1, true])).toEqual(false)

        expect(eq(["", 1, false, false], ["", 1, false, true])).toEqual(false)
        expect(eq(["", 1], ["", 1, true])).toEqual(false)
    })

    /*
    it("lazy", () => {
        const eq = _.equivalenceFor(Category)

        expect(eq({ name: "a", subcategories: [] }, { name: "a", subcategories: [] })).toEqual(true)
    })

    it("set value", () => {
        const schema = pipe(S.NumberFromString, _.empty(() => 1))
        const empty = _.emptyFor(schema);
        expect(empty).toBe(1)
    })

    it("transform", () => {
        const schema: S.Schema<string, readonly [string]> = pipe(
        S.string,
        S.transform(S.tuple(S.string), (s) => [s] as readonly string[], ([s]) => s))
        const empty = _.emptyFor(schema)

        expect(empty).toEqual([""])
    })

    it("record", () => {
        const empty = _.emptyFor(S.record(S.string, S.number));
        expect(empty).toEqual({});
    });

    it("union - discriminated", () => {
        const schema = S.union(
        S.struct({ type: S.literal("a"), a: S.string }),
        S.struct({ type: S.literal("b"), b: S.number })
        )

        const empty = _.emptyFor(schema)
        expect(empty).toEqual({ type: "a", a: "" })
    })

    it("void", () => {
        const empty = _.emptyFor(S.void)
        expect(empty).toBeUndefined()
    })

    it("symbol", () => {
        const empty = _.emptyFor(S.symbol)
        expect(empty.toString()).toEqual(Symbol().toString())
    })

    it("any", () => {
        const empty = _.emptyFor(S.any)
        expect(empty).toBeUndefined()
    })

    it("unknown", () => {
        const empty = _.emptyFor(S.undefined)
        expect(empty).toBeUndefined()
    })

    */
})