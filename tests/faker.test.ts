import { describe, expect, it } from "vitest";
import * as S from "@effect/schema/Schema"
import * as _ from "../src/faker";
import * as F from '@faker-js/faker';
import { pipe } from "@effect/data/Function";


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

describe("faker", () => {
    it("literal", () => {
        const schema = S.literal("a", "b")
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })

    it("boolean", () => {
        const schema = S.boolean
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })

    it("transform", () => {
        const schema: S.Schema<string, readonly [string]> = pipe(
            S.string,
            S.transform(S.tuple(S.string), (s) => [s] as readonly [string], ([s]) => s))

        const fakeTo = _.to(schema)(F.faker)

        expect(S.is(schema)(fakeTo)).to.be.true
    })

    it("number", () => {
        const schema = S.number
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })

    it("bigint", () => {
        const schema = S.bigint
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })

    it("string", () => {
        const schema = S.string
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })

    it("symbol", () => {
        const schema = S.symbol
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })

    it("enum", () => {
        enum Fruits {
          Apple,
          Banana,
        }

        const schema = S.enums(Fruits)
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })

    /*
    it("lazy", () => {
        const schema = Category
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })
    */

    it("union", () => {
        const schema = S.union(S.number, S.string)
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })

    it("record", () => {
        const schema = S.record(S.string, S.number)
        const fake = _.to(schema)(F.faker);

        expect(S.is(schema)(fake)).to.be.true
    });

    it("tuple", () => {
        const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean), S.element(S.string))
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })

    it("struct", () => {
        const schema = pipe(
          S.struct({
            a: S.string,
            b: S.number,
            c: pipe(S.nonEmptyArray(S.number)),
            d: S.optional(S.boolean),
          })
        )
        const fake = _.to(schema)(F.faker)
    
        expect(S.is(schema)(fake)).to.be.true
    })

    it("struct - partial", () => {
        const schema = S.partial(S.struct({ a: S.string, b: S.number }))
        const fake = _.to(schema)(F.faker)

        expect(S.is(schema)(fake)).to.be.true
    })
})