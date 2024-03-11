import * as S from "@effect/schema/Schema";

export interface Category {
	readonly name: string;
	readonly subcategories: ReadonlyArray<Category>;
}

export const Category: S.Schema<Category> = S.suspend(() =>
	S.struct({
		name: S.string,
		subcategories: S.array(Category)
	})
);

export enum Fruits {
	Apple,
	Banana
}
