import * as S from "@effect/schema/Schema"
import * as AST from "@effect/schema/AST"
import * as RA from "@effect/data/ReadonlyArray"
import * as O from "@effect/data/Option"
import { Constraints, combineConstraints, getConstraints, createHookId } from "./common"


export const EmptyHookId = createHookId("EmptyHookId")

interface Empty<A> {
    (): A
}

export const empty = <A, const E extends A = A>(empty: () => E): <I>(self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [EmptyHookId]: empty })

const getAnnotation = AST.getAnnotation<() => unknown>(
  EmptyHookId
)

export const to = <I, A>(schema: S.Schema<I, A>): Empty<A> => go(AST.to(schema.ast))

export const from = <I, A>(schema: S.Schema<I, A>): Empty<I> => go(AST.from(schema.ast))

/** @internal */
const go = (ast: AST.AST, constraints?: Constraints): Empty<any> => {

    const annotations = getAnnotation(ast)
    if(annotations._tag === "Some") {
        return annotations.value
    }

    switch (ast._tag) {
        case "NeverKeyword": throw new Error("cannot build an Empty for `never`")

        case "Literal": return () => ast.literal
        case "ObjectKeyword": return () => ({})
        case "Tuple": {
            const els = ast.elements.filter(e => !e.isOptional).map((e) => go(e.type))
            const rest = ast.rest

            let minItems = 0;
            if(constraints && constraints._tag === "ArrayConstraints") {
                if(constraints.constraints.minItems) minItems = constraints.constraints.minItems;
            }

            if(O.isSome(rest)) {
                return () => {
                    const head = go(RA.headNonEmpty(rest.value));
                    const tail = RA.tailNonEmpty(rest.value).map(e => go(e));
                    const requiredElsCount = els.length + tail.length;
                    const minRestSize = Math.max(minItems - requiredElsCount, 0)

                    const restEls = minRestSize > 0 ? RA.range(1, minRestSize).map(() => head()) : []

                    return [...els.map(el => el()), ...restEls, ...tail.map(el => el())]
                }
            }
            else{
                return () => els.map(el => el())
            }
        }
        case "BigIntKeyword": return () => {
            if(constraints && constraints._tag === "BigintConstraints") {
                if(constraints.constraints.min) return constraints.constraints.min
                if(constraints.constraints.exclusiveMin) 
                    return constraints.constraints.exclusiveMin + 1n
            }

            return 0n
        }
        case "NumberKeyword": return () => {
            if(constraints && constraints._tag === "NumberConstraints") {
                if(constraints.constraints.min) return constraints.constraints.min
                if(constraints.constraints.exclusiveMin) 
                    return constraints.constraints.isInt ? constraints.constraints.exclusiveMin + 1 : constraints.constraints.exclusiveMin
            }

            return 0
        }
        case "StringKeyword": return () => {
            return constraints && constraints._tag === "StringConstraints" 
                ? constraints.constraints.minLength
                ? " ".repeat(constraints.constraints.minLength)
                : "" : ""
        }
        case "BooleanKeyword": return () => false
        case "Refinement": return go(ast.from, combineConstraints(constraints, getConstraints(ast)))
        case "Transform": return go(ast.to)
        case "Declaration": return go(ast.type)
        case "Enums": return () => ast.enums[0][1]
        case "Union": return go(ast.types[0]) // TODO: Pick the "simplest" value
        case "Lazy": return () => go(ast.f())()
        case "TemplateLiteral": {
            const components = [ast.head]
            for (const span of ast.spans) {
                components.push(span.literal)
            }
            return () => components.join("")
        }
        case "SymbolKeyword": return () => Symbol()
        case "UniqueSymbol": return () => ast.symbol
        case "TypeLiteral": {
            const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
            const output: any = {}

            return () => {
                for (let i = 0; i < propertySignaturesTypes.length; i++) {
                    const ps = ast.propertySignatures[i]
                    const name = ps.name
                    if (!ps.isOptional) {
                        output[name] = propertySignaturesTypes[i]()
                    }
                }

                return output
            }
        }
        case "UndefinedKeyword":
        case "UnknownKeyword":
        case "VoidKeyword":
        case "AnyKeyword":
            return () => undefined
    }
}