const express = require("express");
const router = express.Router();

const { all, get, run } = require("../database/db");
const { validate, validationError } = require("../utils/validate");
const { asyncHandler } = require("../utils/asyncHandler");
const { isAdminRequest } = require("./auth");

const FIELD_KEY_PATTERN = /^[a-zA-Z0-9_]+$/;

const LANGUAGES = [
  "PowerShell",
  "Bash",
  "Batch",
  "SQL",
  "Docker",
  "YAML",
  "JSON",
  "Other",
];

const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "checkbox",
  "select",
  "password",
  "ip",
  "domain",
  "email",
];

const scriptSchema = {
  title: { type: "string", required: true, label: "Title" },
  description: { type: "string", default: "" },
  language: { type: "string", default: "Other", label: "Language" },
  categoryId: { type: "number", required: true, label: "Category" },
  subcategoryId: { type: "number", default: null },
  tags: { type: "string", default: "[]" },
  scriptContent: { type: "string", default: "" },
  isTemplate: { type: "boolean", default: false },
  isFavorite: { type: "boolean", default: false },
  isAdminOnly: { type: "boolean", default: false },
  sortOrder: { type: "number", default: 0 },
};

const favoriteSchema = {
  isFavorite: { type: "boolean", required: true, label: "Favorite" },
};

const scriptFieldSchema = {
  fieldKey: { type: "string", required: true, label: "Key" },
  fieldLabel: { type: "string", required: true, label: "Label" },
  fieldType: { type: "string", required: true, label: "Type" },
  isRequired: { type: "boolean", default: false },
  placeholder: { type: "string", default: "" },
  defaultValue: { type: "string", default: "" },
  helpText: { type: "string", default: "" },
  options: { type: "string", default: "[]" },
  sortOrder: { type: "number", default: 0 },
};

function toBool(value) {
  return Boolean(value);
}

function mapScriptRow(row) {
  if (!row) return null;

  return {
    ...row,
    isTemplate: toBool(row.isTemplate),
    isFavorite: toBool(row.isFavorite),
    isAdminOnly: toBool(row.isAdminOnly),
  };
}

function mapScriptFieldRow(row) {
  if (!row) return null;

  return {
    ...row,
    isRequired: toBool(row.isRequired),
  };
}

function validateScript(body) {
  const { value, errors } = validate(scriptSchema, body);

  if (!errors.length && !LANGUAGES.includes(value.language)) {
    errors.push({
      code: "script.invalidLanguage",
      message: `Language must be one of: ${LANGUAGES.join(", ")}`,
      params: { allowed: LANGUAGES.join(", ") },
    });
  }

  return { value, errors };
}

function validateScriptField(body) {
  const { value, errors } = validate(scriptFieldSchema, body);

  if (!errors.length && !FIELD_TYPES.includes(value.fieldType)) {
    errors.push({
      code: "script.invalidFieldType",
      message: `Field type must be one of: ${FIELD_TYPES.join(", ")}`,
      params: { allowed: FIELD_TYPES.join(", ") },
    });
  }

  if (!errors.length && !FIELD_KEY_PATTERN.test(value.fieldKey)) {
    errors.push({
      code: "script.invalidFieldKey",
      message: "Key may only contain letters, numbers and underscores",
      params: {},
    });
  }

  return { value, errors };
}

// Every script response exposes the same columns, so the shape stays identical
// whether a script was just created, updated or only read.
const SCRIPT_COLUMNS = `
  id,
  title,
  description,
  language,
  category_id,
  subcategory_id,
  tags,
  script_content,
  is_template,
  is_favorite,
  is_admin_only,
  sort_order,
  created_at,
  updated_at
`;

function fetchScript(id) {
  return get(`SELECT ${SCRIPT_COLUMNS} FROM scripts WHERE id = ?`, [id]);
}

async function getScriptOr404(id, req, res) {
  const script = await fetchScript(id);

  if (!script || (script.isAdminOnly && !isAdminRequest(req))) {
    res.status(404).json({ error: "Script not found" });
    return null;
  }

  return script;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdmin = isAdminRequest(req);

    const scripts = await all(
      `
      SELECT ${SCRIPT_COLUMNS}
      FROM scripts
      ${isAdmin ? "" : "WHERE is_admin_only = 0"}
      ORDER BY sort_order ASC, title ASC
      `,
    );

    res.json(scripts.map(mapScriptRow));
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const script = await getScriptOr404(req.params.id, req, res);
    if (!script) return;

    res.json(mapScriptRow(script));
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { value, errors } = validateScript(req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
      INSERT INTO scripts (
        title,
        description,
        language,
        category_id,
        subcategory_id,
        tags,
        script_content,
        is_template,
        is_favorite,
        is_admin_only,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        value.title,
        value.description,
        value.language,
        value.categoryId,
        value.subcategoryId,
        value.tags,
        value.scriptContent,
        value.isTemplate ? 1 : 0,
        value.isFavorite ? 1 : 0,
        value.isAdminOnly ? 1 : 0,
        value.sortOrder,
      ],
    );

    const script = await fetchScript(result.id);

    res.status(201).json(mapScriptRow(script));
  }),
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { value, errors } = validateScript(req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
      UPDATE scripts
      SET
        title = ?,
        description = ?,
        language = ?,
        category_id = ?,
        subcategory_id = ?,
        tags = ?,
        script_content = ?,
        is_template = ?,
        is_favorite = ?,
        is_admin_only = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        value.title,
        value.description,
        value.language,
        value.categoryId,
        value.subcategoryId,
        value.tags,
        value.scriptContent,
        value.isTemplate ? 1 : 0,
        value.isFavorite ? 1 : 0,
        value.isAdminOnly ? 1 : 0,
        value.sortOrder,
        req.params.id,
      ],
    );

    if (result.changes === 0) {
      res.status(404).json({ error: "Script not found" });
      return;
    }

    const script = await fetchScript(req.params.id);

    res.json(mapScriptRow(script));
  }),
);

// Favouriting is the one script mutation a non-admin can trigger (from the
// library or the dashboard), so it gets its own endpoint instead of forcing a
// full PUT with every field.
router.patch(
  "/:id/favorite",
  asyncHandler(async (req, res) => {
    const { value, errors } = validate(favoriteSchema, req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const script = await getScriptOr404(req.params.id, req, res);
    if (!script) return;

    await run(
      `
      UPDATE scripts
      SET
        is_favorite = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [value.isFavorite ? 1 : 0, req.params.id],
    );

    res.json(mapScriptRow(await fetchScript(req.params.id)));
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const result = await run(
      `
      DELETE FROM scripts
      WHERE id = ?
      `,
      [req.params.id],
    );

    if (result.changes === 0) {
      res.status(404).json({ error: "Script not found" });
      return;
    }

    res.json({ success: true });
  }),
);

router.get(
  "/:id/fields",
  asyncHandler(async (req, res) => {
    const script = await getScriptOr404(req.params.id, req, res);
    if (!script) return;

    const fields = await all(
      `
      SELECT
        id,
        script_id,
        field_key,
        field_label,
        field_type,
        is_required,
        placeholder,
        default_value,
        help_text,
        options,
        sort_order,
        created_at,
        updated_at
      FROM script_fields
      WHERE script_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [req.params.id],
    );

    res.json(fields.map(mapScriptFieldRow));
  }),
);

router.post(
  "/:id/fields",
  asyncHandler(async (req, res) => {
    const script = await getScriptOr404(req.params.id, req, res);
    if (!script) return;

    const { value, errors } = validateScriptField(req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
      INSERT INTO script_fields (
        script_id,
        field_key,
        field_label,
        field_type,
        is_required,
        placeholder,
        default_value,
        help_text,
        options,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.params.id,
        value.fieldKey,
        value.fieldLabel,
        value.fieldType,
        value.isRequired ? 1 : 0,
        value.placeholder,
        value.defaultValue,
        value.helpText,
        value.options,
        value.sortOrder,
      ],
    );

    const field = await get(
      `
      SELECT
        id,
        script_id,
        field_key,
        field_label,
        field_type,
        is_required,
        placeholder,
        default_value,
        help_text,
        options,
        sort_order,
        created_at,
        updated_at
      FROM script_fields
      WHERE id = ?
      `,
      [result.id],
    );

    res.status(201).json(mapScriptFieldRow(field));
  }),
);

router.put(
  "/:id/fields/:fieldId",
  asyncHandler(async (req, res) => {
    const script = await getScriptOr404(req.params.id, req, res);
    if (!script) return;

    const { value, errors } = validateScriptField(req.body);
    if (errors.length) {
      res.status(400).json(validationError(errors[0]));
      return;
    }

    const result = await run(
      `
      UPDATE script_fields
      SET
        field_key = ?,
        field_label = ?,
        field_type = ?,
        is_required = ?,
        placeholder = ?,
        default_value = ?,
        help_text = ?,
        options = ?,
        sort_order = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND script_id = ?
      `,
      [
        value.fieldKey,
        value.fieldLabel,
        value.fieldType,
        value.isRequired ? 1 : 0,
        value.placeholder,
        value.defaultValue,
        value.helpText,
        value.options,
        value.sortOrder,
        req.params.fieldId,
        req.params.id,
      ],
    );

    if (result.changes === 0) {
      res.status(404).json({ error: "Script field not found" });
      return;
    }

    const field = await get(
      `
      SELECT
        id,
        script_id,
        field_key,
        field_label,
        field_type,
        is_required,
        placeholder,
        default_value,
        help_text,
        options,
        sort_order,
        created_at,
        updated_at
      FROM script_fields
      WHERE id = ?
      `,
      [req.params.fieldId],
    );

    res.json(mapScriptFieldRow(field));
  }),
);

router.delete(
  "/:id/fields/:fieldId",
  asyncHandler(async (req, res) => {
    const result = await run(
      `
      DELETE FROM script_fields
      WHERE id = ? AND script_id = ?
      `,
      [req.params.fieldId, req.params.id],
    );

    if (result.changes === 0) {
      res.status(404).json({ error: "Script field not found" });
      return;
    }

    res.json({ success: true });
  }),
);

module.exports = router;
