/**
 * Type definitions for Vanilla UI Kit Form (`form/form.js`).
 * Browser global: `Form`. UMD/CommonJS: `import Form = require('vanilla-ui-kit/form')`.
 */
import { FamilyStatics, SilentOptions, Theme } from './shared';

declare namespace Form {
  /** Field types (schema mode). `select`/`date`/`phone` family-upgrade to Select/DatePicker/PhoneInput when those are on the page. */
  type FieldType =
    | 'text' | 'email' | 'password' | 'number' | 'url' | 'tel'
    | 'textarea' | 'checkbox' | 'switch' | 'radio' | 'select'
    | 'date' | 'phone' | 'hidden';

  /** Snapshot of all field values (strings, booleans, numbers — by field type). */
  type Values = Record<string, unknown>;

  /** Custom validator: return `null` when valid, a message string when invalid — or a Promise of the same for async checks. Stale async verdicts are discarded automatically. */
  type Validator = (value: unknown, values: Values) => string | null | PromiseLike<string | null>;

  /** Option for `radio`/`select` fields. */
  type FieldOption = string | {
    /** Submitted value. */
    value: string;
    /** Visible label. */
    label?: string;
    /** Not selectable. */
    disabled?: boolean;
  };

  /** One field of the schema. */
  interface FieldSpec {
    /** Field name (the key in `values`). */
    name: string;
    /** Rendered control. Default `'text'`. */
    type?: FieldType;
    /** Label text (rendered with `textContent`). */
    label?: string;
    /** Input placeholder. */
    placeholder?: string;
    /** Help text below the field. `html: true` opts in to TRUSTED hint markup only. */
    hint?: string;
    /** Initial value. */
    value?: unknown;
    /** Required — seeds the `required` validator. */
    required?: boolean;
    /** Start disabled. */
    disabled?: boolean;
    /** Options for `radio`/`select`: `['a', 'b']` or `[{value, label, disabled}]`. */
    options?: FieldOption[];
    /** Numeric minimum (`number` fields). */
    min?: number | string;
    /** Numeric maximum (`number` fields). */
    max?: number | string;
    /** Minimum text length. */
    minlength?: number | string;
    /** Maximum text length. */
    maxlength?: number | string;
    /** Format pattern (string or RegExp). */
    pattern?: string | RegExp;
    /** Custom validator(s), sync or async. */
    validate?: Validator | Validator[];
    /** Per-field opt-in for trusted HINT markup only — user values are never rendered as HTML. Default `false`. */
    html?: boolean;
    /** `textarea` rows. */
    rows?: number;
    /** `textarea`: grow with content. */
    autoGrow?: boolean;
  }

  /** Overridable UI/validation strings (`{min}`/`{max}` placeholders supported where shown). */
  interface Labels {
    /** Default `'This field is required'`. */
    required?: string;
    /** Default `'Enter a valid email address'`. */
    email?: string;
    /** Default `'Enter a valid URL'`. */
    url?: string;
    /** Default `'Enter a number'`. */
    number?: string;
    /** Default `'Must be at least {min} characters'`. */
    minlength?: string;
    /** Default `'Must be at most {max} characters'`. */
    maxlength?: string;
    /** Default `'Does not match the expected format'`. */
    pattern?: string;
    /** Generic form-level submit failure message. */
    submitError?: string;
    /** Any other UI string the form renders. */
    [key: string]: string | undefined;
  }

  /** Per-field meta passed to `watch` callbacks. */
  interface FieldMeta {
    /** Value differs from its initial value. */
    dirty: boolean;
    /** Field has been blurred at least once. */
    touched: boolean;
    /** Current error message, or `null`. */
    error: string | null;
  }

  interface Options {
    /** Schema mode: build the whole form (labels, hints, error regions, submit button, honeypot). */
    fields?: FieldSpec[];
    /** Submit callback; may return a Promise (pending = spinner + repeat submits ignored). Resolve = success, reject/throw = error mapping. */
    onSubmit?: (values: Values, form: Form) => unknown | PromiseLike<unknown>;
    /** Let the form fetch for you: the POST target URL. */
    action?: string;
    /** HTTP method. Default `'POST'` (or the form's `method` attribute). */
    method?: string;
    /** `'json'` (default) JSON body | `'form'` FormData. */
    encoding?: 'json' | 'form';
    /** CSRF-friendly extra request headers. */
    headers?: Record<string, string>;
    /** When to validate: `'blur'` (then live once errored), `'change'` (always live), `'submit'`. Default `'blur'`. */
    validateOn?: 'blur' | 'change' | 'submit';
    /** Shown in a polite live region on success — or as `Toast.success(...)` if the family Toast is on the page. */
    successMessage?: string;
    /** Reset the form after a successful submit. */
    resetOnSuccess?: boolean;
    /** Decoy field + time gate spam traps. Default `true`. */
    honeypot?: boolean;
    /** Custom decoy field name (default: a realistic generated name, `website_url` style). */
    honeypotName?: string;
    /** Submits faster than this many ms after render are treated as spam. Default `1500`. */
    minFillTime?: number;
    /** Fires on any value change. */
    onChange?: (values: Values, form: Form) => void;
    /** Fires after a rejected submit is rendered, for custom handling. */
    onError?: (error: unknown, form: Form) => void;
    /** Fires when the honeypot/time gate trips (the bot sees the normal success UX). */
    onSpam?: (values: Values) => void;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Overridable UI/validation strings. */
    labels?: Labels;
  }

  /** The built-in validators as pure functions (usable in Node, e.g. to share rules with your server). Return `null` when valid, a message when invalid. */
  interface Validators {
    /** Non-empty check. */
    required(value: unknown, values?: Values | null, labels?: Labels): string | null;
    /** Email format (empty values pass — pair with `required`). */
    email(value: unknown, values?: Values | null, labels?: Labels): string | null;
    /** URL format (empty values pass). */
    url(value: unknown, values?: Values | null, labels?: Labels): string | null;
    /** Numeric with optional bounds. */
    number(value: unknown, min?: number | string | null, max?: number | string | null, labels?: Labels): string | null;
    /** Text length bounds. */
    length(value: unknown, min?: number | string | null, max?: number | string | null, labels?: Labels): string | null;
    /** Pattern match (string patterns are anchored `^(?:…)$`). */
    pattern(value: unknown, pattern?: string | RegExp | null, labels?: Labels): string | null;
  }
}

interface Form {
  /** Plain-object snapshot of all field values. */
  readonly values: Form.Values;
  /** `{ name: message }` snapshot of current errors. */
  readonly errors: Record<string, string>;
  /** One field's current value. */
  getValue(name: string): unknown;
  /** Set one field (`{silent: true}` skips watchers/onChange). */
  setValue(name: string, value: unknown, options?: SilentOptions): void;
  /** Set several fields at once. */
  setValues(values: Form.Values, options?: SilentOptions): void;
  /** Show a (server) error on a field. */
  setError(name: string, message: string): void;
  /** Clear every field error. */
  clearErrors(): void;
  /** Any field changed from its initial value. */
  isDirty(): boolean;
  /** Sync validators only, no rendering. */
  isValid(): boolean;
  /** Watch one field. Returns an unsubscribe function. */
  watch(name: string, fn: (value: unknown, meta: Form.FieldMeta) => void): () => void;
  /** Watch any change. Returns an unsubscribe function. */
  watch(fn: (values: Form.Values, changedName: string, meta: Form.FieldMeta) => void): () => void;
  /** Programmatic submit (validation, honeypot, loading state included). Resolves `true` on success. */
  submit(): Promise<boolean>;
  /** Full validation pass; `{silent: true}` skips rendering. Resolves `true` when valid. */
  validate(options?: SilentOptions): Promise<boolean>;
  /** Back to initial values, errors cleared. */
  reset(): void;
  /** Re-enable every field. */
  enable(): void;
  /** Disable every field. */
  disable(): void;
  /** Tear down; enhance mode restores the original form untouched. */
  destroy(): void;
}

interface FormStatic extends FamilyStatics<Form.Options, Form> {
  /** Schema mode: pass a container + `fields`. Enhance mode: pass an existing `<form>`. `new Form(null, …)` returns an inert no-op handle (SSR-safe). */
  new (target: string | Element | null, options?: Form.Options): Form;
  prototype: Form;
  /** Constructor alias: `Form.create(el, opts)` = `new Form(el, opts)`. */
  create(target: string | Element | null, options?: Form.Options): Form;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Form | null;
  /** The pure built-in validators (work in Node). */
  validators: Form.Validators;
}

declare const Form: FormStatic;

export = Form;
