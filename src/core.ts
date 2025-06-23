import { IdConfig, IdContext, Id, IdPrefix, TypeSpec } from "./types.js";

/**
 * Creates an ID context instance for your defined entity types.
 *
 * @param definitions A map where keys are your entity type names and
 * values are the specification for generating IDs for that type.
 * @param config Global configuration for ID generation behavior.
 * @returns An IdContext instance to create, validate, and parse IDs.
 * @example
 * const shortId = createIdContext({
 *   user: "u",
 *   post: { prefix: "p", length: 12 }
 * });
 * const userId = shortId.create("u"); // "u_..."
 */
export const createIdContext = <const T extends Record<string, TypeSpec>>(
  definitions: T,
  config: IdConfig
): IdContext<keyof T & (string | symbol)> => {
  type EntityType = keyof T & (string | symbol);

  const entityTypes = Object.keys(definitions) as EntityType[];

  if (entityTypes.length === 0) {
    throw new Error("Cannot create an ID context with no type definitions.");
  }

  const { typeToPrefix, typeToLength, prefixToType, minLength, maxLength } = entityTypes.reduce(
    (acc, entityType) => {
      const spec = definitions[entityType];
      const [prefix, length] = typeof spec === "string" ? [spec, config.defaultLength] : [spec.prefix, spec.length];

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

  const create = (entityType: EntityType): Id => {
    const prefix = typeToPrefix[entityType];
    if (!prefix) {
      throw new Error(`Unknown type: ${String(entityType)}`);
    }

    const length = typeToLength[entityType];
    const uniquePart = config.generateUniqueId(length);

    if (typeof uniquePart !== "string") {
      throw new Error(
        `The provided 'generateUniqueId' function must return a string, but it returned a value of type ${typeof uniquePart}.`
      );
    }

    if (uniquePart.length !== length) {
      throw new Error(
        `The provided 'generateUniqueId' function returned a string with length ${uniquePart.length} but expected length ${length}.`
      );
    }

    if (!/^[a-zA-Z0-9]+$/.test(uniquePart)) {
      throw new Error(
        "The provided 'generateUniqueId' function returned a string with invalid characters. Only alphanumeric characters (a-z, A-Z, 0-9) are allowed."
      );
    }

    return `${prefix}_${uniquePart}`;
  };

  const getType = (id: Id | undefined): EntityType | undefined => {
    if (!id) {
      return undefined;
    }

    const prefix = id.split("_")[0];
    return prefixToType[prefix] as EntityType | undefined;
  };

  const getPrefix = (entityType: EntityType): IdPrefix => {
    const prefix = typeToPrefix[entityType];
    if (prefix === undefined) {
      throw new Error(`Unknown type provided to getPrefix: ${String(entityType)}`);
    }

    return prefix;
  };

  const isValid = (id: string | undefined): boolean => {
    if (typeof id !== "string" || !id.includes("_")) {
      return false;
    }

    const [prefix, uniquePart] = id.split("_");

    const entityType = prefixToType[prefix];

    if (entityType === undefined) {
      return false;
    }

    const expectedLength = typeToLength[entityType];
    if (uniquePart.length !== expectedLength) {
      return false;
    }

    return /^[a-zA-Z0-9]+$/.test(uniquePart);
  };

  const isType =
    (entityType: EntityType) =>
    (id: string): boolean =>
      getType(id) === entityType;

  const findAll = (text: string): Id[] => text.match(FIND_ALL_REGEX)?.filter(isValid) ?? [];

  return {
    create,
    getType,
    getPrefix,
    isValid,
    isType,
    findAll,
  };
};
