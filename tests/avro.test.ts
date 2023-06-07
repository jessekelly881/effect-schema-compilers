import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema"
import { pipe } from "@effect/data/Function"
import * as _ from "../src/avro"

describe("Avro", () => {
    it("never", () => {
        expect(() => _.to(S.never)()).toThrowError(
            new Error("cannot convert `never` to AvroSchema")
        );
    })
})