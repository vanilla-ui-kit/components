/**
 * Type definitions for Vanilla UI Kit Upload (`upload/upload.js`).
 * Browser global: `Upload`. UMD/CommonJS: `import Upload = require('vanilla-ui-kit/upload')`.
 */
import { FamilyStatics, Theme } from './shared';

declare namespace Upload {
  /** Lifecycle of a managed file. */
  type Status = 'pending' | 'uploading' | 'done' | 'error';

  /** Declarative uploader: the built-in XHR poster with real progress events. */
  interface Action {
    /** Endpoint URL. */
    action: string;
    /** HTTP method. Default `'POST'`. */
    method?: string;
    /** Multipart field name. Default `'file'`. */
    fieldName?: string;
    /** Extra request headers. */
    headers?: Record<string, string>;
    /** Send cookies cross-origin. Default `false`. */
    withCredentials?: boolean;
  }

  /** Custom uploader: resolve → success (`response`), reject → error row with retry. */
  type UploadFn = (file: File, onProgress: (fraction: number) => void) => Promise<unknown>;

  /** One managed file as reported by `getFiles()` / `uploadAll()`. */
  interface Entry {
    /** The underlying File. */
    file: File;
    /** Current lifecycle state. */
    status: Status;
    /** Resolved value / parsed 2xx body once `'done'`. */
    response?: unknown;
    /** Failure once `'error'`. */
    error?: unknown;
  }

  interface Options {
    /** Accept several files (`false`: a new pick replaces the current one). Default `false`. */
    multiple?: boolean;
    /** Accept filter (native syntax), also validated on drop/paste. */
    accept?: string;
    /** Per-file byte cap; violations render inline errors. */
    maxSize?: number;
    /** Total file cap. */
    maxFiles?: number;
    /** Dropzone prompt text. */
    text?: string;
    /** Where the file list renders. Default `'below'`. */
    listPosition?: 'below' | 'none';
    /** Upload immediately on add (else call `uploadAll()`). Default `false`. */
    autoUpload?: boolean;
    /** How to upload: a custom function or the built-in XHR action. */
    upload?: Upload.UploadFn | Upload.Action;
    /** Form field name for the underlying input (no-JS/plain-form fallback). */
    name?: string;
    /** Start disabled. Default `false`. */
    disabled?: boolean;
    /** Theme mode. Default `'auto'`. */
    theme?: Theme;
    /** `false` = headless (no CSS injected). Default `true`. */
    styles?: boolean;
    /** Overridable UI strings (browse/drop/retry/remove…, `{name}` interpolated). */
    labels?: Record<string, string>;
    /** A file passed validation and joined the list. */
    onAdd?: (file: File, upload: Upload) => void;
    /** A file was removed (in-flight XHR aborted, object URL revoked). */
    onRemove?: (file: File, upload: Upload) => void;
    /** Upload progress, `pct` 0–100. */
    onProgress?: (file: File, pct: number, upload: Upload) => void;
    /** Upload finished; `response` is the resolved value / parsed body. */
    onDone?: (file: File, response: unknown, upload: Upload) => void;
    /** Upload failed (retry button rendered). */
    onError?: (file: File, error: unknown, upload: Upload) => void;
  }
}

interface Upload {
  /** Add files programmatically (same validation as drop/paste). */
  addFiles(files: FileList | File[]): void;
  /** Remove a file (aborts its in-flight upload). */
  removeFile(file: File): void;
  /** Start every pending upload; resolves with `getFiles()` when all settle. */
  uploadAll(): Promise<Upload.Entry[]>;
  /** Current managed files with their statuses. */
  getFiles(): Upload.Entry[];
  /** Remove every file. */
  clear(): void;
  /** Re-enable the dropzone. */
  enable(): void;
  /** Disable the dropzone. */
  disable(): void;
  /** Restore an enhanced input, remove built DOM. */
  destroy(): void;
}

interface UploadStatic extends FamilyStatics<Upload.Options, Upload> {
  /** Build in a container (a real hidden file input is created), or enhance an existing `<input type=file>`. */
  new (target: string | Element, options?: Upload.Options): Upload;
  prototype: Upload;
  /** Constructor alias: same as `new Upload(...)`. */
  create(target: string | Element, options?: Upload.Options): Upload;
  /** Instance for an element, or `null`. */
  get(target: string | Element): Upload | null;
  /** Human-readable size: `1536` → `'1.5 KB'`. */
  formatBytes(bytes: number): string;
}

declare const Upload: UploadStatic;

export = Upload;
