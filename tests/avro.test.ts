import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema"
import * as _ from "../src/avro"
import type { schema } from "avsc"
import { pipe } from "@effect/data/Function";
import { Category, Fruits } from "./common";


describe("Avro", () => {
    it("never/ ", () => {
        expect(() => _.to(S.never)()).toThrowError(
            new Error("cannot convert `never` to AvroSchema")
        );
    })

    it("string/ ", () => {
        const avroSchema = _.to(S.string)();
        expect(avroSchema).toEqual({ type: "string" } satisfies schema.AvroSchema)
    })

    it("number/ ", () => {
        const avroSchema = _.to(S.number)();
        expect(avroSchema).toEqual({ type: "float" } satisfies schema.AvroSchema)
    })

    it("number/ int", () => {
        const schema = pipe(S.number, S.int())
        const avroSchema = _.to(schema)();
        expect(avroSchema).toEqual({ type: "int" } satisfies schema.AvroSchema)
    })

    it("boolean/ ", () => {
        const avroSchema = _.to(S.boolean)();
        expect(avroSchema).toEqual({ type: "boolean" } satisfies schema.AvroSchema)
    })

    it("enum/ ", () => {
        const schema = S.enums(Fruits)
        const avroSchema = _.to(schema)();
        expect(avroSchema).toEqual({ name: "", type: "enum", symbols: ["Apple", "Banana"] } satisfies schema.AvroSchema)
    })

    it("literal/ ", () => {
        const val = _.to(S.literal("a"))();

        expect(val).toEqual({ name: "", type: "enum", symbols: ["a"] } satisfies schema.AvroSchema)
    })
})