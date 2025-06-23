export interface IdConfig {
  generateUniqueId: (length: number) => string;
  defaultLength: number;
}

export interface IdContext<T extends string | symbol> {
  readonly create: (type: T) => Id;
  readonly getType: (id: Id | undefined) => T | undefined;
  readonly getPrefix: (type: T) => IdPrefix;
  readonly isValid: (id: Id | undefined) => boolean;
  readonly isType: (type: T) => (id: Id) => boolean;
  readonly findAll: (text: string) => Id[];
}

export type Id = string;
export type IdPrefix = string;
export type TypeSpec = IdPrefix | { prefix: IdPrefix; length: number };
