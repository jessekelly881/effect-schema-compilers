import * as S from "@effect/schema/Schema"
import * as AST from "@effect/schema/AST"

export const EmptyHookId = "@effect/schema/annotation/EmptyHookId" as const

interface Empty<A> {
    (): A
}

export const empty = <I, A, const E extends A = A>(empty: () => E): (self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [EmptyHookId]: empty })

const getAnnotation = AST.getAnnotation<() => unknown>(
  EmptyHookId
)

export const to = <I, A>(schema: S.Schema<I, A>): A => go(AST.to(schema.ast))()

export const from = <I, A>(schema: S.Schema<I, A>): I => go(AST.from(schema.ast))()


const go = (ast: AST.AST): Empty<any> => {

    const annotations = getAnnotation(ast)
    if(annotations._tag === "Some") {
        return annotations.value
    }

    switch (ast._tag) {
        case "Literal": return () => ast.literal
        case "ObjectKeyword": return () => ({})
        case "Tuple": {
            const els = ast.elements.map((e) => go(e.type))
            return () => els.map(el => el())
        }
        case "BigIntKeyword": return () => 0n
        case "NumberKeyword": return () => 0
        case "StringKeyword": return () => ""
        case "BooleanKeyword": return () => false
        case "Refinement": return go(ast.from)
        case "Transform": return go(ast.to)
        case "Declaration": return go(ast.type)
        case "Enums": return () => ast.enums[0][1]
        case "Union": return go(ast.types[0]) // TODO: Pick the "simplest" value
        case "Lazy": return go(ast.f())
        case "TemplateLiteral": {
            const components = [ast.head]
            for (const span of ast.spans) {
                components.push(span.literal)
            }
            return () => components.join("")
        }
        case "SymbolKeyword": return () => Symbol()
        case "UniqueSymbol": return () => ast.symbol.toString()
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

    throw new Error(`unhandled ${ast._tag}`)
}