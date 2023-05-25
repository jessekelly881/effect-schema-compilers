import * as S from "@effect/schema/Schema"
import * as O from "@effect/data/Option"
import * as AST from "@effect/schema/AST"
import { pipe } from "@effect/data/Function"

export const EmptyHookId = "@effect/schema/annotation/EmptyHookId" as const

export const empty = <A>(empty: () => A): <I>(self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [EmptyHookId]: empty })

const getAnnotation = AST.getAnnotation<() => unknown>(
  EmptyHookId
)

export const emptyFor = <I, A>(schema: S.Schema<I, A>): A => {
    const go = (ast: AST.AST): A => {

        const annotations = getAnnotation(ast)
        if(annotations._tag === "Some") {
         return annotations.value() as A
        }

        switch (ast._tag) {
            case "Literal": return ast.literal as A
            case "ObjectKeyword": return {} as A
            case "Tuple": return ast.elements.map((e) => go(e.type)) as A
            case "BigIntKeyword": return 0n as A
            case "NumberKeyword": return 0 as A
            case "StringKeyword": return "" as A
            case "BooleanKeyword": return false as A
            case "Refinement": return go(ast.from)
            case "Transform": return go(ast.to)
            case "Declaration": return go(ast.type)
            case "Enums": return ast.enums[0][1] as A
            case "Union": return go(ast.types[0]) // TODO: Pick the "simplest" value
            case "TemplateLiteral": {
                const components = [ast.head]
                for (const span of ast.spans) {
                    components.push(span.literal)
                }
                return components.join("") as A
            }
            case "SymbolKeyword": return Symbol() as A
            case "UniqueSymbol": return JSON.stringify(ast.symbol.toString()) as A
            case "TypeLiteral": {
                const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
                const output: any = {}

                for (let i = 0; i < propertySignaturesTypes.length; i++) {
                    const ps = ast.propertySignatures[i]
                    const name = ps.name
                    if (!ps.isOptional) {
                    output[name] = propertySignaturesTypes[i]
                    }
                }

                return output
            }
            case "UndefinedKeyword":
            case "UnknownKeyword":
            case "VoidKeyword":
            case "AnyKeyword":
                return undefined
        }

        throw new Error(`unhandled ${ast._tag}`)

    }

    return go(schema.ast)
}