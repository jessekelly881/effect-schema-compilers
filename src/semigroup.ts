import * as S from "@effect/schema/Schema"
import * as Semi from "@effect/data/typeclass/Semigroup"
import * as AST from "@effect/schema/AST"

export const SemigroupHookId = "@effect/schema/annotation/SemigroupHookId" as const

export const semigroup = <I, A>(semigroup: Semi.Semigroup<A>): (self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [SemigroupHookId]: semigroup })

const getAnnotation = AST.getAnnotation<Semi.Semigroup<unknown>>(
  SemigroupHookId
)

/**
 * @description 
 * Generates a Semigroup from a given Schema. By default all values implement Semigroup.last so by default values are just overridden.
 */
export const semigroupFor = <I, A>(schema: S.Schema<I, A>): Semi.Semigroup<A> => {
    const go = (ast: AST.AST): Semi.Semigroup<A>  => {

        const annotations = getAnnotation(ast)
        if(annotations._tag === "Some") {
         return annotations.value as Semi.Semigroup<A>
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
                return Semi.last<A>()

            case "Refinement": return go(ast.from)
            case "Transform": return go(ast.to)
            case "Declaration": return go(ast.type)

            case "Tuple": return Semi.tuple(...ast.elements.map((e) => go(e.type))) as Semi.Semigroup<A>

            case "TypeLiteral": {
                const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
                const output: any = {}

                for (let i = 0; i < propertySignaturesTypes.length; i++) {
                    const ps = ast.propertySignatures[i]
                    const name = ps.name
                    output[name] = propertySignaturesTypes[i]
                }

                return Semi.struct(output) as Semi.Semigroup<A>
            }
        }

        throw new Error(`unhandled ${ast._tag}`)

    }

    return go(schema.ast)
}