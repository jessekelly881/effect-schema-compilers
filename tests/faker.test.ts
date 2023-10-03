import { describe, expect, it } from "vitest";
import * as S from "@effect/schema/Schema"
import * as _ from "../src/faker";
import * as F from '@faker-js/faker';
import { pipe } from "effect/Function";
import { Category, Fruits } from "./common";


/**
 * Tests that the generated value correctly matches the schema
 */
const generatesValidValue = <I, A>(schema: S.Schema<I, A>) => {
    const fake = _.to(schema)(F.faker)
    const isValid = S.is(schema)(fake)
    if(!isValid) console.log(fake)

    expect(isValid).to.be.true
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

    it("templateLiteral. a", () => generatesValidValue(S.templateLiteral(S.literal("a"))))
    it("templateLiteral. a b", () => generatesValidValue(S.templateLiteral(S.literal("a"), S.literal(" "), S.literal("b"))))
    it("templateLiteral. ${string}", () => generatesValidValue(S.templateLiteral(S.string)))
    it("templateLiteral. a${string}", () => generatesValidValue(S.templateLiteral(S.literal("a"), S.string)))
    it("templateLiteral. a${string}b", () => generatesValidValue(S.templateLiteral(S.literal("a"), S.string, S.literal("b"))))

    it("templateLiteral. a${string*}b", () => {
        const schema = S.templateLiteral(
            S.literal("a"), 
            pipe(S.string, _.faker(f => f.string.alpha({ length: { min: 0, max: 10 } }))), 
            S.literal("b")
        );

        generatesValidValue(schema)
    });

    // filters
    it("number/ int", () => generatesValidValue(pipe(S.number, S.int())))
    it("number/ (0, 5)", () => generatesValidValue(pipe(S.number, S.greaterThan(0), S.lessThan(5))))
    it("number/ int (0, 5)", () => generatesValidValue(pipe(S.number, S.int(), S.greaterThan(0), S.lessThan(5))))
    it("number/ int [0, 5]", () => generatesValidValue(pipe(S.number, S.int(), S.greaterThanOrEqualTo(0), S.lessThanOrEqualTo(5))))
    it("bigint/ (0, 5)", () => generatesValidValue(pipe(S.bigint, S.greaterThanBigint(0n), S.lessThanBigint(5n))))
    it("string/ length", () => generatesValidValue(pipe(S.string, S.length(10))))
    it("string/ minLength, maxLength", () => generatesValidValue(pipe(S.string, S.minLength(30), S.maxLength(50))))
    it("string/ pattern", () => generatesValidValue(pipe(S.string, S.pattern(/hello-[1-5]/))))
    it("array/ itemsCount", () => generatesValidValue(pipe(S.array(S.string), S.itemsCount(10))))


    it("record. <a${string}b, number>", () => {
        const schema = S.record(S.templateLiteral(S.literal("a"), S.string, S.literal("b")), S.number)
        generatesValidValue(schema)
    });

    it("never", () => {
        expect(() => _.to(S.never)(F.faker)).toThrowError(
            new Error("cannot build a Faker for `never`")
        );
    });

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

    it("struct - extra props", () => {
        const schema = pipe(S.struct({ a: S.symbol, b: S.number }), S.extend(S.record(S.string, S.string)))
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
            age: pipe(S.number, S.int(), S.greaterThanOrEqualTo(18), S.lessThanOrEqualTo(120)),
            sex: pipe(S.literal("male", "female"))
        });

        F.faker.seed(25) 
        const fakeData = _.to(Person)(F.faker)
        expect(fakeData).toEqual({ name: "Seth Gottlieb", age: 36, sex: "male" })

        F.faker.seed() // Unset seed for later tests
    })

})