/**
 * Input validation middleware factory.
 * Validates request body against a schema definition.
 *
 * Schema format:
 * {
 *   fieldName: {
 *     required: boolean,
 *     type: "string" | "number" | "boolean" | "object" | "array",
 *     minLength: number (for strings),
 *     maxLength: number (for strings),
 *     pattern: RegExp (for strings),
 *     message: string (custom error message),
 *   }
 * }
 *
 * @param {Object} schema - Validation schema object
 * @returns {Function} Fastify preHandler middleware
 *
 * @example
 * const signupSchema = {
 *   email: { required: true, type: "string", pattern: /^\S+@\S+\.\S+$/, message: "Valid email required" },
 *   password: { required: true, type: "string", minLength: 6, message: "Password min 6 chars" },
 * };
 * fastify.post("/signup", { preHandler: [validate(signupSchema)] }, signupHandler);
 */
export const validate = (schema) => {
  return async (req, reply) => {
    const errors = [];
    const body = req.body || {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      // Check required
      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push(rules.message || `${field} is required`);
        continue;
      }

      // Skip optional fields that are not provided
      if (value === undefined || value === null) continue;

      // Check type
      if (rules.type) {
        const actualType = Array.isArray(value) ? "array" : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
          continue;
        }
      }

      // Check string constraints
      if (typeof value === "string") {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(rules.message || `${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(rules.message || `${field} format is invalid`);
        }
      }
    }

    if (errors.length > 0) {
      return reply.status(400).send({ message: "Validation failed", errors });
    }
  };
};
