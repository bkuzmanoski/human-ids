import { HumanIdConfig, IdManager, HumanId, IdPrefix, EntityTypeSpec } from "./types.js";
import { generateId } from "./utils.js";

const DEFAULT_CONFIG: Required<HumanIdConfig> = {
  generateId: generateId,
  defaultLength: 8,
};

/**
 * Creates an ID manager for your defined entity types.
 *
 * @param definitions A map where keys are your entity type names and
 * values are the specification for generating IDs for that type.
 * @param config Optional global configuration for ID generation behavior.
 * @returns An IdManager instance to create, validate, and parse IDs.
 * @example
 * const manager = createIdManager({
 *   user: "user",
 *   post: { prefix: "post", length: 12 }
 * });
 * const userId = manager.create("user"); // "user_..."
 */
export const createIdManager = <const T extends Record<string, EntityTypeSpec>>(
  definitions: T,
  config: HumanIdConfig = {}
): IdManager<keyof T & (string | symbol)> => {
  type EntityType = keyof T & (string | symbol);

  const entityTypes = Object.keys(definitions) as EntityType[];

  if (entityTypes.length === 0) {
    throw new Error("Cannot create an ID manager with no type definitions.");
  }

  const resolvedConfig = { ...DEFAULT_CONFIG, ...config };
  const { typeToPrefix, typeToLength, prefixToType, minLength, maxLength } = entityTypes.reduce(
    (acc, entityType) => {
      const spec = definitions[entityType];
      const [prefix, length] =
        typeof spec === "string" ? [spec, resolvedConfig.defaultLength] : [spec.prefix, spec.length];

      if (!prefix || typeof prefix !== "string" || prefix.includes("_")) {
        throw new Error(
          `Invalid prefix for type "${String(
            entityType
          )}": Prefixes must be non-empty strings and cannot contain underscores.`
        );
      }

      if (typeof length !== "number" || length <= 0) {
        throw new Error(`Invalid length for type "${String(entityType)}": Length must be a positive number.`);
      }

      if (acc.prefixToType[prefix]) {
        throw new Error(`Duplicate prefix "${prefix}" detected. Prefixes must be unique.`);
      }

      acc.typeToPrefix[entityType] = prefix;
      acc.typeToLength[entityType] = length;
      acc.prefixToType[prefix] = entityType;
      acc.minLength = Math.min(acc.minLength, length);
      acc.maxLength = Math.max(acc.maxLength, length);

      return acc;
    },
    {
      typeToPrefix: {} as Record<EntityType, IdPrefix>,
      typeToLength: {} as Record<EntityType, number>,
      prefixToType: {} as Record<IdPrefix, EntityType>,
      minLength: Infinity,
      maxLength: 0,
    }
  );

  const allPrefixes = Object.keys(prefixToType).join("|");
  const lengthQuantifier = minLength === maxLength ? `{${minLength}}` : `{${minLength},${maxLength}}`;
  const FIND_ALL_REGEX = new RegExp(`\\b(${allPrefixes})_[a-zA-Z0-9]${lengthQuantifier}\\b`, "g");

  const create = (entityType: EntityType): HumanId => {
    const prefix = typeToPrefix[entityType];
    if (!prefix) {
      throw new Error(`Unknown entity type: ${String(entityType)}`);
    }

    const length = typeToLength[entityType];
    const id = resolvedConfig.generateId(length);
    return `${prefix}_${id}`;
  };

  const getType = (humanId: HumanId | undefined): EntityType | undefined => {
    if (!humanId) {
      return undefined;
    }

    const prefix = humanId.split("_")[0];
    return prefixToType[prefix] as EntityType | undefined;
  };

  const getPrefix = (entityType: EntityType): IdPrefix => {
    const prefix = typeToPrefix[entityType];
    if (prefix === undefined) {
      throw new Error(`Unknown entity type provided to getPrefix: ${String(entityType)}`);
    }

    return prefix;
  };

  const isValid = (humanId: string | undefined): boolean => {
    if (typeof humanId !== "string" || !humanId.includes("_")) {
      return false;
    }

    const [prefix, randomPart] = humanId.split("_");
    const entityType = prefixToType[prefix];

    if (entityType === undefined) {
      return false;
    }

    const expectedLength = typeToLength[entityType];
    if (randomPart.length !== expectedLength) {
      return false;
    }

    return /^[a-zA-Z0-9]+$/.test(randomPart);
  };

  const isType =
    (entityType: EntityType) =>
    (humanId: string): boolean =>
      getType(humanId) === entityType;

  const findAll = (text: string): HumanId[] => text.match(FIND_ALL_REGEX) ?? [];

  return {
    FIND_ALL_REGEX,
    create,
    getType,
    getPrefix,
    isValid,
    isType,
    findAll,
  };
};
