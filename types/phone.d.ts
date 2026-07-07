/**
 * Type definitions for Vanilla UI Kit PhoneInput (`phone/phone.js`).
 * Browser global: `PhoneInput`. UMD/CommonJS: `import PhoneInput = require('vanilla-ui-kit/phone')`.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace PhoneInput {
  /** Result of `PhoneInput.parse()` — also the shape behind `getValue()`. */
  interface ParseResult {
    /** ISO-3166 alpha-2 country, e.g. `'ae'`. */
    country: string;
    /** Dial code with `+`, e.g. `'+971'`. */
    dialCode: string;
    /** Nationally formatted number, e.g. `'50 123 4567'`. */
    national: string;
    /** E.164 output, e.g. `'+971501234567'`. */
    e164: string;
    /** Pragmatic length-based validity (not libphonenumber). */
    valid: boolean;
  }

  /** Current value reported by `getValue()` / `onChange`. */
  interface Value {
    /** E.164 output, e.g. `'+971501234567'`. */
    e164: string;
    /** Nationally formatted number. */
    national: string;
    /** ISO-3166 alpha-2 country. */
    country: string;
    /** Pragmatic validity flag. */
    valid: boolean;
  }

  /** One row of the embedded 242-entry ITU country table (`PhoneInput.countries`). */
  interface Country {
    /** ISO-3166 alpha-2, e.g. `'ae'`. */
    iso2: string;
    /** English country name. */
    name: string;
    /** Dial code without `+`, e.g. `'971'`. */
    dialCode: string;
    /** Priority among countries sharing a dial code (0 = primary owner). */
    order: number;
    /** Allowed national digit counts. */
    lengths: number[];
    /** As-you-type format pattern, `#` per digit. */
    pattern: string;
    /** Area-code prefixes disambiguating shared dial codes, or `null`. */
    areaCodes: string[] | null;
  }

  /** Input to a custom `validator`. */
  interface ValidatorInfo {
    /** ISO-3166 alpha-2 country. */
    country: string;
    /** National digits only. */
    digits: string;
    /** E.164 candidate. */
    e164: string;
  }

  /** Overridable UI strings. */
  interface Labels {
    /** Country button accessible name. */
    country?: string;
    /** Dropdown search placeholder. */
    search?: string;
    /** Empty dropdown text. */
    noResults?: string;
    /** Announced/shown when the number is invalid. */
    invalid?: string;
  }

  interface Options {
    /** Initial ISO-3166 alpha-2 country. Default `'us'`. */
    country?: string;
    /** iso2s pinned to the top of the dropdown. Default `[]`. */
    preferredCountries?: string[];
    /** Whitelist of iso2s. Default `null`. */
    onlyCountries?: string[] | null;
    /** Blacklist of iso2s. Default `null`. */
    excludeCountries?: string[] | null;
    /** Display national formatting (output is always E.164); `false` shows `+971 50 123 4567`. Default `true`. */
    nationalMode?: boolean;
    /** `'auto'` = example number for the country, a string, or `false` for none. Default `'auto'`. */
    placeholder?: 'auto' | string | false;
    /** Show `+971` in the country button. Default `true`. */
    showDialCode?: boolean;
    /** Search box in the dropdown. Default `true`. */
    searchable?: boolean;
    /** `'blur'` = red/green only after first blur (Maz-style); `'live'` = immediately. Default `'blur'`. */
    validate?: 'blur' | 'live';
    /** Overrides the built-in length check (e.g. plug in libphonenumber). Default `null`. */
    validator?: ((info: ValidatorInfo) => boolean) | null;
    /** Adds a hidden input carrying the E.164 for forms. Default `null`. */
    name?: string | null;
    /** Start disabled. Default `false`. */
    disabled?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless, no CSS injected. Default `true`. */
    styles?: boolean;
    /** Overridable UI strings: `country`, `search`, `noResults`, `invalid`. */
    labels?: Labels;
    /** Fires on every edit with `{e164, national, country, valid}`. */
    onChange?: (value: Value) => void;
    /** Country switched (flag/dial code). */
    onCountryChange?: (iso2: string) => void;
    /** Validity flipped. */
    onValidityChange?: (valid: boolean) => void;
  }
}

interface PhoneInput {
  /** Current value: `{ e164, national, country, valid }`. */
  getValue(): PhoneInput.Value;
  /** Set the number; a `+dialcode` prefix also sets the country. */
  setValue(value: string): void;
  /** Switch the flag/dial code. */
  setCountry(iso2: string): void;
  /** Current ISO-3166 alpha-2 country. */
  getCountry(): string;
  /** Enable/disable the control. */
  setDisabled(disabled: boolean): void;
  /** Open the country dropdown. */
  open(): void;
  /** Close the country dropdown. */
  close(): void;
  /** Focus the tel input. */
  focus(): void;
  /** Unwrap the original input, remove everything. */
  destroy(): void;
}

interface PhoneInputStatic extends FamilyStatics<PhoneInput.Options, PhoneInput> {
  /** Enhance an `<input>` (coerced to `type="tel"`), or build the control inside any container (with a hidden input when `name` is given). SSR-safe: constructing without a DOM returns an inert handle. */
  new (target: string | Element | null, options?: PhoneInput.Options): PhoneInput;
  prototype: PhoneInput;
  /** Constructor alias. */
  create(target: string | Element | null, options?: PhoneInput.Options): PhoneInput;
  /** Instance registry lookup. */
  get(target: string | Element): PhoneInput | null;
  /** Parse any phone string (pure, works in Node): `PhoneInput.parse('+971501234567')` → `{ country, dialCode, national, e164, valid }`. */
  parse(str: string, iso2?: string): PhoneInput.ParseResult;
  /** Format digits nationally for a country (pure): `PhoneInput.format('4155552671', 'us')` → `'(415) 555-2671'`. */
  format(str: string | number, iso2?: string): string;
  /** Pragmatic validity check (pure): `PhoneInput.isValid('+14155552671', 'us')` → `true`. */
  isValid(str: string, iso2?: string): boolean;
  /** Example national number for a country (pure): `PhoneInput.exampleNumber('gb')` → `'1234 567891'`. */
  exampleNumber(iso2: string): string;
  /** The full 242-entry country data table. */
  countries: PhoneInput.Country[];
  /** 20×15 SVG flag markup for a country; unknown iso2s get a neutral rounded badge. */
  flag(iso2: string): string;
}

declare const PhoneInput: PhoneInputStatic;

export = PhoneInput;
