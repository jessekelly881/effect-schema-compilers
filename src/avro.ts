import * as S from "@effect/schema/Schema"
import * as AST from "@effect/schema/AST"
import { Constraints, createHookId } from "./common"


export const AvroHookId = createHookId("AvroHookId")

interface Avro {
    (): object
}

export const avro = <I, A, const E extends A = A>(avro: Avro): (self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [AvroHookId]: avro })

const getAnnotation = AST.getAnnotation<Avro>(
  AvroHookId
)

export const to = <I, A>(schema: S.Schema<I, A>): Avro => go(AST.to(schema.ast))

export const from = <I, A>(schema: S.Schema<I, A>): Avro => go(AST.from(schema.ast))

/** @internal */
const go = (ast: AST.AST, constraints?: Constraints): Avro => {

    const annotations = getAnnotation(ast)
    if(annotations._tag === "Some") {
        return annotations.value
    }

    switch (ast._tag) {
        case "NeverKeyword": throw new Error("cannot convert `never` to AvroSchema")
    }
}