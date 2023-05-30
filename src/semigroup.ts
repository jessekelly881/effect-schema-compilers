import * as S from "@effect/schema/Schema"
import * as Semi from "@effect/data/typeclass/Semigroup"
import * as AST from "@effect/schema/AST"
import { memoizeThunk } from "./common"
import * as RA from "@effect/data/ReadonlyArray"
import * as O from "@effect/data/Option"

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
            // TODO: Use rest elements
            const els = ast.elements.map((e) => go(e.type))
            const rest = ast.rest

            return () => Semi.make((self: [], that: []) => {
                let output: any = []

                const es = els.map((e) => e());

                // elements
                for(let i = 0; i < es.length; i++) {
                    const { combine } = es[i]
                    const result = combine(self[i], that[i]);
                    output.push(result)
                }

                if(O.isSome(rest)) {
                    const head = go(RA.headNonEmpty(rest.value));
                    const tail = RA.tailNonEmpty(rest.value).map((e) => go(e));
                    const minLen = tail.length + els.length // min len of tuple

                    // rest head
                    const thatRestLen = that.length - minLen;

                    for(let h = 0; h < thatRestLen; h ++) {
                        output.push(that[els.length + h])
                    }

                    // rest tail
                    for(let t = 0; t < tail.length; t++) {
                        const { combine } = tail[t]()
                        const result = combine(self[self.length - tail.length + t], that[that.length - tail.length + t]);
                        output.push(result)
                    }
                }

                return output
            })
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