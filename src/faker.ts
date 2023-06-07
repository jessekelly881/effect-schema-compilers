import * as S from "@effect/schema/Schema"
import * as AST from "@effect/schema/AST"
import type * as F from '@faker-js/faker';
import * as O from "@effect/data/Option"
import { pipe } from "@effect/data/Function";
import * as RA from "@effect/data/ReadonlyArray"
import { Constraints, combineConstraints, createHookId, getConstraints, memoizeThunk } from "./common"
import { isBigint, isNumber } from "@effect/data/Predicate";

export const FakerHookId = createHookId("FakerHookId")

interface Faker<A> {
    (faker: F.Faker): A
}

export const faker = <I, A>(faker: Faker<A>): (self: S.Schema<I, A>) => S.Schema<I, A> => 
    S.annotations({ [FakerHookId]: faker })

const getAnnotation = AST.getAnnotation<Faker<unknown>>(
  FakerHookId
)

export const to = <I, A>(schema: S.Schema<I, A>): Faker<A> => go(AST.to(schema.ast))

export const from = <I, A>(schema: S.Schema<I, A>): Faker<I> => go(AST.from(schema.ast))

/**
 * @param depthLimit - Used to limit recursion and only generate elements of limited depth
 */
const go = (ast: AST.AST, depthLimit = 10, constraints?: Constraints): Faker<any> => {

    /**
     * Attempts to prevent reaching recursion limit by limiting object complexity when depth limit reached.
     * The recursion limit can still be reached as no attempt to limit recursion is made if doing so would produce an invalid instance of the type. 
     */
    const depthLimitReached = depthLimit <= 0; 

    const annotations = getAnnotation(ast)
    if(annotations._tag === "Some") {
        return annotations.value
    }

    switch (ast._tag) {
        case "NeverKeyword": throw new Error("cannot build a Faker for `never`")

        case "Refinement": return go(ast.from, depthLimit, combineConstraints(constraints, getConstraints(ast)))
        case "Transform": return go(ast.to, depthLimit)
        case "Declaration": return go(ast.type, depthLimit)

        case "ObjectKeyword": return (f: F.Faker) => ({})
        case "Enums": return (f: F.Faker) => f.helpers.arrayElement(ast.enums.map(e => e[1]))
        case "Literal": return (f: F.Faker) => f.helpers.arrayElement([ast.literal])
        case "BooleanKeyword": return (f: F.Faker) => f.datatype.boolean()
        case "NumberKeyword": return (f: F.Faker) => {
            if(constraints && constraints._tag === "NumberConstraints") {
                const c = constraints.constraints

                const min = c.min ?? c.exclusiveMin ?? Number.MIN_SAFE_INTEGER
                const max = c.max ?? c.exclusiveMax ?? Number.MAX_SAFE_INTEGER

                const val =  constraints.constraints.isInt 
                    ? f.number.int({ min: isNumber(c.exclusiveMin) ? min + 1 : min, max: isNumber(c.exclusiveMax) ? max - 1 : max }) 
                    : f.number.float({ min, max })

                return val
            }

            return f.number.float()
        }
        case "BigIntKeyword": return (f: F.Faker) => {
            if(constraints && constraints._tag === "BigintConstraints") {
                const c = constraints.constraints

                const min = c.min ?? c.exclusiveMin
                const max = c.max ?? c.exclusiveMax

                const val = f.number.bigInt({ 
                    min: isBigint(c.exclusiveMin) ? min + 1n : min, 
                    max: isBigint(c.exclusiveMax) ? max - 1n : max 
                }) 

                return val
            }

            return f.number.bigInt()
        }
        case "StringKeyword": return (f: F.Faker) => {
            const c = constraints;

            if(c && c._tag === "StringConstraints") {
                const min = c.constraints.minLength ?? 0
                const max = c.constraints.maxLength
                const pattern = c.constraints.pattern;

                return c.constraints.pattern ? f.helpers.fromRegExp(pattern) : f.string.sample({ min, max })
            }

            return f.string.sample()
        }
        case "SymbolKeyword": return (f: F.Faker) => Symbol(f.string.alphanumeric({ length: { min: 0, max: 10 } }))
        case "UniqueSymbol": return (f: F.Faker) => Symbol(f.string.alphanumeric({ length: { min: 0, max: 10 } }))
        case "TemplateLiteral": {
            return (f: F.Faker) => {
                const components = [ast.head]
                for (const span of ast.spans) {
                    components.push(go(span.type, depthLimit - 1)(f))
                    components.push(span.literal)
                }
                return components.join("")
            }
        }
        case "Union": {
            const u = ast.types.map(t => go(t, depthLimit))
            return (f: F.Faker) => f.helpers.arrayElement(u.map(el => el(f)))
        }
        case "Tuple": {
            const els = ast.elements.map((e) => go(e.type, depthLimit - 1))

            if(O.isSome(ast.rest)) {
                const head = go(RA.headNonEmpty(ast.rest.value), depthLimit - 1);
                const tail = RA.tailNonEmpty(ast.rest.value).map(e => go(e, depthLimit - 1));

                return (f: F.Faker) => {
                    const requiredElsCount = els.length + tail.length;

                    let min = 0, max = 10; // default max, min
                    const c = constraints 
                    if(c && c._tag === "ArrayConstraints") {
                        if(c.constraints.maxItems) {
                            max = c.constraints.maxItems ?? max;
                        }
                        if(c.constraints.minItems) {
                            min = c.constraints.minItems ?? min;
                        }
                    }


                    const numToGen = f.number.int({ min, max })
                    const restEls = depthLimitReached ? [] : RA.range(0, numToGen - 1).map(() => head(f))
                    const postRestEls = tail.map(el => el(f))

                    return [...els.map(el => el(f)), ...restEls, ...postRestEls]
                }
            }
            else{
                return (f: F.Faker) => els.map(el => el(f))
            }
        }
        case "Lazy": {
            const get = memoizeThunk(() => go(ast.f(), depthLimit))
            return (f: F.Faker) => get()(f)
        }
        case "TypeLiteral": {
            const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type, depthLimit - 1))
            const indexSignatures = ast.indexSignatures.map((is) =>
                [go(is.parameter), go(is.type)] as const
            )

            return (f: F.Faker) => {
                let output: any = {};

                // handle property signatureIs
                for (let i = 0; i < propertySignaturesTypes.length; i++) {
                    const ps = ast.propertySignatures[i];
                    const name = ps.name;

                    // whether to include prop if it is optional
                    const includeOptional = depthLimitReached ? false : f.datatype.boolean(); 
                    if(!ps.isOptional || includeOptional) {
                        output[name] = propertySignaturesTypes[i](f);
                    }
                }

                // index signatures
                for (let i = 0; i < indexSignatures.length; i++) {
                    const parameter = indexSignatures[i][0](f)
                    const type = indexSignatures[i][1](f)

                    output[parameter] = type
                }

                return output
            };
        }
    }

    throw new Error(`unhandled ${ast._tag}`)
}