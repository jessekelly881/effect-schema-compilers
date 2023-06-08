import * as S from "@effect/schema/Schema"
import * as AST from "@effect/schema/AST"
import { Constraints, combineConstraints, createHookId, getConstraints } from "./common"
import type { Schema } from "avsc"


export const AvroHookId = createHookId("AvroHookId")

interface Avro {
    (): Schema
}

export const avro = <I, A, const E extends A = A>(avro: Avro): (self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [AvroHookId]: avro })

const getAnnotation = AST.getAnnotation<Avro>(
  AvroHookId
)

export const to = <I, A>(schema: S.Schema<I, A>): Avro => go(AST.to(schema.ast))

export const from = <I, A>(schema: S.Schema<I, A>): Avro => go(AST.from(schema.ast))

interface Context {
    optional: boolean
}

/** @internal */
const go = (ast: AST.AST, c?: Constraints): Avro => {

    const annotations = getAnnotation(ast)
    if(annotations._tag === "Some") {
        return annotations.value
    }

    switch (ast._tag) {
        case "NeverKeyword": throw new Error("cannot convert `never` to AvroSchema")

        case "StringKeyword": return () => ({ "type" : "string" })
        case "NumberKeyword": return () => {
            if(c && c._tag === "NumberConstraints" && c.constraints.isInt) {
                return { "type": "int" }
            }

            return { "type" : "float" }
        }

        case "BooleanKeyword": return () => ({ "type": "boolean" })
        case "Enums": return () => ({ "type": "enum", "symbols": ast.enums.map(e => e[0]), "name": "" })
        case "Literal": return () => ({ "type": "enum", "symbols": [ast.literal.toString()], "name": "" })

        case "Refinement": return go(ast.from, combineConstraints(c, getConstraints(ast)))
    }
}