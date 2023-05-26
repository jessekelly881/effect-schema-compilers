import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema"
import { pipe } from "@effect/data/Function"
import * as _ from "../src/empty"


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
        const fn = () => 0
        const ast = pipe(S.NumberFromString, _.empty(fn)).ast.annotations
        expect(ast).toEqual({
            [_.EmptyHookId]: fn
        })
    })

    it("set value", () => {
        const schema = pipe(S.NumberFromString, _.empty(() => 1))
        const empty = _.emptyFor(schema);
        expect(empty).toBe(1)
    })

    it("number", () => {
        const empty = _.emptyFor(S.number)
        expect(empty).toBe(0)
    })

    it("string", () => {
        const empty = _.emptyFor(S.string);
        expect(empty).toBe("");
    });

    it("boolean", () => {
        const empty = _.emptyFor(S.boolean);
        expect(empty).toBe(false);
    });

    it("transform", () => {
        const schema: S.Schema<string, readonly [string]> = pipe(
        S.string,
        S.transform(S.tuple(S.string), (s) => [s] as readonly string[], ([s]) => s))
        const empty = _.emptyFor(schema)

        expect(empty).toEqual([""])
    })

    it("tuple", () => {
        const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean))
        const empty = _.emptyFor(schema)
        expect(empty).toEqual(["", 0])
    })

    it("literal", () => {
        const s = pipe(S.literal("a", "b"), _.empty(() => "a" as const));
        const empty = _.emptyFor(s)
        expect(empty).toBe("a")
    })

    it("record", () => {
        const empty = _.emptyFor(S.record(S.string, S.number));
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
        const empty = _.emptyFor(schema)
    
        expect(empty).toEqual({ a: "", b: 0, c: [], e: { f: [0, "literal"] }, g: "/" })
    })
    
    it("struct - partial", () => {
        const schema = S.partial(S.struct({ a: S.string, b: S.number }))
        const empty = _.emptyFor(schema)

        expect(empty).toEqual({})
    })

    it("union - discriminated", () => {
        const schema = S.union(
        S.struct({ type: S.literal("a"), a: S.string }),
        S.struct({ type: S.literal("b"), b: S.number })
        )

        const empty = _.emptyFor(schema)
        expect(empty).toEqual({ type: "a", a: "" })
    })

    it("template literal", () => {
        const schema = S.templateLiteral(S.literal("a"), S.string, S.literal("b"))
        const empty = _.emptyFor(schema)

        expect(empty).toBe("ab")
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

    it("lazy", () => {
        const empty = _.emptyFor(Category)
        expect(empty).toEqual({ name: "", subcategories: [] })
    })
})
