import { describe, expect, it } from "vitest";
import * as S from "@effect/schema/Schema"
import * as _ from "../src/faker";
import * as F from '@faker-js/faker';
import { pipe } from "@effect/data/Function";
import { Category, Fruits } from "./common";


/**
 * Tests that the generated value correctly matches the schema
 */
const generatesValidValue = <I, A>(schema: S.Schema<I, A>) => {
    const fake = _.to(schema)(F.faker)
    expect(S.is(schema)(fake)).to.be.true
}

describe("faker", () => {
    it("literal", () => generatesValidValue(S.literal("a", "b")))
    it("boolean", () => generatesValidValue(S.boolean))
    it("number", () => generatesValidValue(S.number))
    it("bigint", () => generatesValidValue(S.bigint))
    it("string", () => generatesValidValue(S.string))
    it("symbol", () => generatesValidValue(S.symbol))
    it("union", () => generatesValidValue(S.union(S.number, S.string)))
    it("record", () => generatesValidValue(S.record(S.string, S.number)));
    it("enum", () => generatesValidValue(S.enums(Fruits)))
    it("array", () => generatesValidValue(S.array(S.string)))

    it("transform", () => {
        const schema: S.Schema<string, readonly [string]> = pipe(
            S.string,
            S.transform(S.tuple(S.string), (s) => [s] as readonly [string], ([s]) => s))

        generatesValidValue(schema);
    })

    it("tuple", () => {
        const schema = pipe(S.tuple(S.string, S.number), S.rest(S.boolean), S.element(S.string))
        generatesValidValue(schema);
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

        generatesValidValue(schema)
    })

    it("struct - partial", () => {
        const schema = S.partial(S.struct({ a: S.string, b: S.number }))
        generatesValidValue(schema)
    })

    it("lazy", () => {
        const schema = Category
        const fake = _.to(schema)(F.faker)

        generatesValidValue(schema)
        expect(S.is(schema)(fake)).to.be.true
    })

    it("example", () => { 
        const Person = S.struct({
            name: pipe(S.string, _.faker(f => f.person.fullName())),
            age: pipe(S.number, _.faker(f => f.number.int({ min: 18, max: 120 }))),
            sex: pipe(S.literal("male", "female"), _.faker(f => f.person.sexType()))
        });

        F.faker.seed(25) 
        const fakeData = _.to(Person)(F.faker)
        expect(fakeData).toEqual({ name: "Seth Gottlieb", age: 36, sex: "female" })

        F.faker.seed() // Unset seed for later tests
    })

})