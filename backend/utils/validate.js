// Validation failures carry a machine-readable `code` plus the parameters that
// go into the message, so the frontend can render them in the user's own
// language. `message` is the English fallback for anything talking to the API
// directly (curl, scripts, another service).
function fail(code, message, params) {
  return { code, message, params };
}

function requiredError(label) {
  return fail("validation.required", `${label || "Value"} is required`, {
    label: label || "Value",
  });
}

function validatePresence(value, { label, required } = {}) {
  if (!required) return null;

  if (value === undefined || value === null) {
    return requiredError(label);
  }

  if (typeof value === "string" && !value.trim()) {
    return requiredError(label);
  }

  return null;
}

function validateString(
  value,
  { label, required, default: def, min, max } = {},
) {
  if (value === undefined || value === null) {
    if (def !== undefined) return { value: def, error: null };
    if (required) return { value, error: requiredError(label) };
    return { value: "", error: null };
  }

  const str = String(value);
  const trimmed = str.trim();

  if (required && !trimmed) {
    return { value: str, error: requiredError(label) };
  }

  if (min !== undefined && trimmed.length < min) {
    return {
      value: str,
      error: fail(
        "validation.minLength",
        `${label || "Value"} must be at least ${min} characters`,
        { label: label || "Value", min },
      ),
    };
  }

  if (max !== undefined && trimmed.length > max) {
    return {
      value: str,
      error: fail(
        "validation.maxLength",
        `${label || "Value"} may be at most ${max} characters`,
        { label: label || "Value", max },
      ),
    };
  }

  return { value: trimmed, error: null };
}

function validateNumber(
  value,
  { label, required, default: def, min, max } = {},
) {
  if (value === undefined || value === null) {
    if (def !== undefined) return { value: def, error: null };
    if (required) return { value, error: requiredError(label) };
    return { value: null, error: null };
  }

  const num = Number(value);

  if (!Number.isFinite(num)) {
    return {
      value,
      error: fail(
        "validation.notANumber",
        `${label || "Value"} must be a valid number`,
        { label: label || "Value" },
      ),
    };
  }

  if (min !== undefined && num < min) {
    return {
      value: num,
      error: fail(
        "validation.min",
        `${label || "Value"} must be at least ${min}`,
        {
          label: label || "Value",
          min,
        },
      ),
    };
  }

  if (max !== undefined && num > max) {
    return {
      value: num,
      error: fail(
        "validation.max",
        `${label || "Value"} may be at most ${max}`,
        {
          label: label || "Value",
          max,
        },
      ),
    };
  }

  return { value: num, error: null };
}

function validateBoolean(value, { label, required, default: def } = {}) {
  if (value === undefined || value === null) {
    if (def !== undefined) return { value: def, error: null };
    if (required) return { value, error: requiredError(label) };
    return { value: false, error: null };
  }

  return { value: Boolean(value), error: null };
}

function validate(schema, data) {
  const errors = [];
  const value = {};

  for (const [key, rules] of Object.entries(schema)) {
    const rawValue = data?.[key];

    switch (rules.type) {
      case "string": {
        const result = validateString(rawValue, rules);
        if (result.error) errors.push(result.error);
        else value[key] = result.value;
        break;
      }
      case "number": {
        const result = validateNumber(rawValue, rules);
        if (result.error) errors.push(result.error);
        else value[key] = result.value;
        break;
      }
      case "boolean": {
        const result = validateBoolean(rawValue, rules);
        if (result.error) errors.push(result.error);
        else value[key] = result.value;
        break;
      }
      case "presence": {
        const error = validatePresence(rawValue, rules);
        if (error) errors.push(error);
        else value[key] = rawValue;
        break;
      }
      default:
        value[key] = rawValue;
    }
  }

  return { value, errors };
}

// Shapes the first validation failure into the JSON body every route returns.
// Accepts a plain string too, for the route-level checks that build their own
// message instead of going through a schema.
function validationError(error) {
  if (typeof error === "string") {
    return { error };
  }

  return { error: error.message, code: error.code, params: error.params };
}

module.exports = {
  validate,
  validateString,
  validateNumber,
  validateBoolean,
  validationError,
};
