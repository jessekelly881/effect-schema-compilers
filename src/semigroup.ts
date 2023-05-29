import * as S from "@effect/schema/Schema"
import * as Semi from "@effect/data/typeclass/Semigroup"
import * as AST from "@effect/schema/AST"
import { memoizeThunk } from "./common"

export const SemigroupHookId = "@effect/schema/annotation/SemigroupHookId" as const

export const semigroup = <I, A>(semigroup: Semi.Semigroup<A>): (self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [SemigroupHookId]: semigroup })

const getAnnotation = AST.getAnnotation<Semi.Semigroup<unknown>>(
  SemigroupHookId
)

interface Semigroup<A> {
    (): Semi.Semigroup<A>
}

/**
 * @description 
 * Generates a Semigroup from a given Schema. By default all values implement Semigroup.last so by default values are just overridden.
 */
export const to = <I, A>(schema: S.Schema<I, A>): Semigroup<A> => go(AST.to(schema.ast))

export const from = <I, A>(schema: S.Schema<I, A>): Semigroup<I> => go(AST.from(schema.ast))

const go = (ast: AST.AST): Semigroup<any>  => {

    const annotations = getAnnotation(ast)
    if(annotations._tag === "Some") {
        return () => annotations.value
    }

    switch (ast._tag) {
        case "Literal": 
        case "ObjectKeyword": 
        case "BigIntKeyword": 
        case "NumberKeyword": 
        case "StringKeyword": 
        case "BooleanKeyword": 
        case "Enums": 
        case "Union": 
        case "SymbolKeyword": 
        case "UniqueSymbol": 
        case "UndefinedKeyword":
        case "UnknownKeyword":
        case "VoidKeyword":
        case "AnyKeyword":
        case "TemplateLiteral": 
            return () => Semi.last()

        case "Refinement": return go(ast.from)
        case "Transform": return go(ast.to)
        case "Declaration": return go(ast.type)

        case "Lazy": {
            const get = memoizeThunk(() => go(ast.f()))
            return () => get()()
        }

        case "Tuple": {
            const els = ast.elements.map((e) => go(e.type))
            return () => Semi.tuple(...els.map(e => e()))
        }

        case "TypeLiteral": {
            const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
            const output: any = {}

            return () => {
                for (let i = 0; i < propertySignaturesTypes.length; i++) {
                    const ps = ast.propertySignatures[i]
                    const name = ps.name
                    output[name] = propertySignaturesTypes[i]()
                }

                return Semi.struct(output)
            }
        }
    }

    throw new Error(`unhandled ${ast._tag}`)
}