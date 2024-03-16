import * as AST from "@effect/schema/AST";
import * as S from "@effect/schema/Schema";
import * as O from "effect/Option";
import * as RA from "effect/ReadonlyArray";
import {
	Constraints,
	combineConstraints,
	createHookId,
	getConstraints
} from "./common";

export const EmptyHookId = createHookId("EmptyHookId");

interface Empty<A> {
	(): A;
}

export const empty = <A, const E extends A = A>(
	empty: () => E
): (<I>(self: S.Schema<I, A>) => S.Schema<I, A>) =>
	S.annotations({ [EmptyHookId]: empty });

const getAnnotation = AST.getAnnotation<() => unknown>(EmptyHookId);

export const make = <A, I>(schema: S.Schema<A, I>): Empty<A> => go(schema.ast);

/** @internal */
const go = (ast: AST.AST, constraints?: Constraints): Empty<any> => {
	const annotations = getAnnotation(ast);
	if (annotations._tag === "Some") {
		return annotations.value;
	}

	switch (ast._tag) {
		case "NeverKeyword":
			throw new Error("cannot build an Empty for `never`");

		case "Literal":
			return () => ast.literal;
		case "ObjectKeyword":
			return () => ({});
		case "TupleType": {
			const els = ast.elements
				.filter((e) => !e.isOptional)
				.map((e) => go(e.type));
			const rest = ast.rest;

			let minItems = 0;
			if (constraints && constraints._tag === "ArrayConstraints") {
				if (constraints.constraints.minItems)
					minItems = constraints.constraints.minItems;
			}

			return () => {
				const values = RA.fromIterable(rest.values());
				const head = RA.head(values).pipe(O.map(go));
				const tail = RA.tail(values).pipe(
					O.map((asts) => asts.map((e) => go(e))),
					O.getOrElse(() => [])
				);

				const requiredElsCount = els.length + tail.length;
				const minRestSize = Math.max(minItems - requiredElsCount, 0);

				const s = O.all(RA.range(1, minRestSize).map(() => head)).pipe(
					O.getOrElse(() => [] as Empty<any>[])
				);
				const restEls = minRestSize > 0 ? s : [];

				return [
					...els.map((el) => el()),
					...restEls.map((el) => el()),
					...tail.map((el) => el())
				];
			};
		}
		case "BigIntKeyword":
			return () => {
				if (constraints && constraints._tag === "BigintConstraints") {
					if (constraints.constraints.min)
						return constraints.constraints.min;
				}

				return 0n;
			};
		case "NumberKeyword":
			return () => {
				if (constraints && constraints._tag === "NumberConstraints") {
					if (constraints.constraints.min)
						return constraints.constraints.min;
					if (constraints.constraints.exclusiveMin)
						return constraints.constraints.isInt
							? constraints.constraints.exclusiveMin + 1
							: constraints.constraints.exclusiveMin;
				}

				return 0;
			};
		case "StringKeyword":
			return () => {
				return constraints && constraints._tag === "StringConstraints"
					? constraints.constraints.minLength
						? " ".repeat(constraints.constraints.minLength)
						: ""
					: "";
			};
		case "BooleanKeyword":
			return () => false;
		case "Refinement":
			return go(
				ast.from,
				combineConstraints(constraints, getConstraints(ast))
			);
		case "Transformation":
			return go(
				ast.to,
				combineConstraints(constraints, getConstraints(ast))
			);
		case "Declaration":
			throw new Error(
				`cannot build an Empty for a declaration without annotations (${ast})`
			);
		case "Enums":
			return () => ast.enums[0][1];
		case "Union":
			return go(ast.types[0]); // TODO: Pick the "simplest" value
		case "Suspend":
			return () => go(ast.f())();
		case "TemplateLiteral": {
			const components = [ast.head];
			for (const span of ast.spans) {
				components.push(span.literal);
			}
			return () => components.join("");
		}
		case "SymbolKeyword":
			return () => Symbol();
		case "UniqueSymbol":
			return () => ast.symbol;
		case "TypeLiteral": {
			const propertySignaturesTypes = ast.propertySignatures.map((f) =>
				go(f.type)
			);
			const output: any = {};

			return () => {
				for (let i = 0; i < propertySignaturesTypes.length; i++) {
					const ps = ast.propertySignatures[i];
					const name = ps.name;
					if (!ps.isOptional) {
						output[name] = propertySignaturesTypes[i]();
					}
				}

				return output;
			};
		}
		case "UndefinedKeyword":
		case "UnknownKeyword":
		case "VoidKeyword":
		case "AnyKeyword":
			return () => undefined;
	}
};
