export interface HumanIdConfig {
  generateId?: (length: number) => string;
  defaultLength?: number;
}

export interface IdManager<T extends string | symbol> {
  readonly FIND_ALL_REGEX: RegExp;
  readonly VALIDATION_REGEX: RegExp;
  readonly create: (entityType: T) => HumanId;
  readonly getType: (id: HumanId | undefined) => T | undefined;
  readonly getPrefix: (entityType: T) => IdPrefix;
  readonly isValid: (id: HumanId | undefined) => boolean;
  readonly isType: (entityType: T) => (id: HumanId) => boolean;
  readonly findAll: (text: string) => HumanId[];
}

export type HumanId = string;
export type IdPrefix = string;
export type EntityTypeSpec = IdPrefix | { prefix: IdPrefix; length: number };
