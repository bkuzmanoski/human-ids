import { describe, it } from "node:test";
import assert from "node:assert";

import { createIdManager } from "./core.js";

void describe("createIdManager", () => {
  void describe("Initialization", () => {
    void it("should throw an error if no definitions are provided", () => {
      assert.throws(() => createIdManager({}), {
        message: "Cannot create an ID manager with no type definitions.",
      });
    });

    void it("should throw an error for duplicate prefixes", () => {
      assert.throws(() => createIdManager({ user: "user", admin: "user" }), {
        message: 'Duplicate prefix "user" detected. Prefixes must be unique.',
      });
    });

    void it("should throw an error for invalid prefixes", () => {
      assert.throws(() => createIdManager({ user: "user_admin" }), {
        message: 'Invalid prefix for type "user": Prefixes must be non-empty strings and cannot contain underscores.',
      });
      assert.throws(() => createIdManager({ user: "" }), {
        message: 'Invalid prefix for type "user": Prefixes must be non-empty strings and cannot contain underscores.',
      });
    });

    void it("should successfully create a manager with valid definitions", () => {
      const manager = createIdManager({ user: "user", post: { prefix: "post", length: 12 } });
      assert.ok(manager, "Manager should be created");
      assert.ok(manager.create, "Manager should have a create method");
    });

    void it("should respect custom defaultLength", () => {
      const manager = createIdManager({ user: "user" }, { defaultLength: 10 });
      assert.strictEqual(manager.create("user").split("_")[1].length, 10);
    });

    void it("should respect custom generateId function", () => {
      const manager = createIdManager(
        { user: "user" },
        {
          generateId: (length) => "a".repeat(length),
        }
      );
      assert.strictEqual(manager.create("user"), "user_aaaaaaaa");
    });
  });

  const manager = createIdManager({
    user: "user",
    post: { prefix: "post", length: 12 },
    comment: { prefix: "comment", length: 8 },
  });

  void describe("ID Creation (`.create`)", () => {
    void it("should create an ID with the correct prefix and default length", () => {
      const id = manager.create("user");
      assert.ok(id.startsWith("user_"));
      assert.strictEqual(id.length, "user_".length + 8);
    });

    void it("should create an ID with the correct prefix and specified length", () => {
      const id = manager.create("post");
      assert.ok(id.startsWith("post_"));
      assert.strictEqual(id.length, "post_".length + 12);
    });

    void it("should throw an error for an unknown entity type", () => {
      // @ts-expect-error - Intentionally testing invalid input
      assert.throws(() => manager.create("invalidType"), {
        message: "Unknown entity type: invalidType",
      });
    });
  });

  void describe("ID Validation (`.isValid`)", () => {
    void it("should return true for a valid ID", () => {
      const userId = manager.create("user");
      const postId = manager.create("post");
      assert.strictEqual(manager.isValid(userId), true);
      assert.strictEqual(manager.isValid(postId), true);
    });

    void it("should return false for an ID with a valid prefix but incorrect length", () => {
      assert.strictEqual(manager.isValid("user_1234567"), false, "User ID should have length 8");
      assert.strictEqual(manager.isValid("post_12345"), false, "Post ID should have length 12");
    });

    void it("should return false for an ID with an invalid prefix", () => {
      assert.strictEqual(manager.isValid("invalid_12345678"), false);
    });

    void it("should return false for malformed IDs", () => {
      assert.strictEqual(manager.isValid("user-12345678"), false);
      assert.strictEqual(manager.isValid("user_123_456"), false);
    });

    void it("should return false for undefined or empty string", () => {
      assert.strictEqual(manager.isValid(undefined), false);
      assert.strictEqual(manager.isValid(""), false);
    });
  });

  void describe("Type Retrieval (`.getType`)", () => {
    void it("should return the correct type for a valid ID", () => {
      const userId = manager.create("user");
      assert.strictEqual(manager.getType(userId), "user");
    });

    void it("should return undefined for an invalid or unknown ID", () => {
      assert.strictEqual(manager.getType("invalid_123"), undefined);
    });

    void it("should return undefined for an undefined input", () => {
      assert.strictEqual(manager.getType(undefined), undefined);
    });
  });

  void describe("Prefix Retrieval (`.getPrefix`)", () => {
    void it("should return the correct prefix for a known type", () => {
      assert.strictEqual(manager.getPrefix("user"), "user");
      assert.strictEqual(manager.getPrefix("post"), "post");
    });

    void it("should throw an error for an unknown type", () => {
      // @ts-expect-error - Intentionally testing invalid input
      assert.throws(() => manager.getPrefix("foo"), { message: "Unknown entity type provided to getPrefix: foo" });
    });
  });

  void describe("Type Checking (`.isType`)", () => {
    const isUser = manager.isType("user");
    const userId = manager.create("user");
    const postId = manager.create("post");

    void it("should return a function", () => {
      assert.strictEqual(typeof isUser, "function");
    });

    void it("should return true for an ID of the correct type", () => {
      assert.strictEqual(isUser(userId), true);
    });

    void it("should return false for an ID of a different type", () => {
      assert.strictEqual(isUser(postId), false);
    });
  });

  void describe("ID Extraction (`.findAll`)", () => {
    void it("should find all valid IDs in a string", () => {
      const userId = manager.create("user");
      const postId = manager.create("post");
      const text = `Action by ${userId} on post ${postId}. No other ids.`;
      const found = manager.findAll(text);
      assert.deepStrictEqual(found, [userId, postId]);
    });

    void it("should return an empty array if no IDs are found", () => {
      const text = "This text has no valid identifiers.";
      assert.deepStrictEqual(manager.findAll(text), []);
    });
  });
});
