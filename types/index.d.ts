/**
 * Type definitions for the Vanilla UI Kit bundle (`vanilla-ui-kit`).
 *
 *   import { Toast, DatePicker, VC } from 'vanilla-ui-kit';        // ESM
 *   const { Toast } = require('vanilla-ui-kit');                    // CJS
 *
 * Importing the bundle has the same page-level effect as the script tag:
 * every component registers with the core and its browser global exists.
 */
import _VC = require('./core');
import _DatePicker = require('./datepicker');
import _Toast = require('./toast');
import _Tooltip = require('./tooltip');
import _Menu = require('./menu');
import _Modal = require('./modal');
import _Tabs = require('./tabs');
import _Select = require('./select');
import _CommandPalette = require('./command');
import _Form = require('./form');
import _PhoneInput = require('./phone');
import _Drawer = require('./drawer');
import _Autocomplete = require('./autocomplete');
import _Slider = require('./slider');
import _Popconfirm = require('./popconfirm');
import _Segmented = require('./segmented');
import _Upload = require('./upload');
import _NumberInput = require('./number');
import _Progress = require('./progress');
import _Pagination = require('./pagination');
import _EmptyState = require('./empty');
import _Rating = require('./rating');

export declare const VC: typeof _VC;
/** Long-form alias of `VC`. */
export declare const VanillaUI: typeof _VC;
export declare const DatePicker: typeof _DatePicker;
export declare const Toast: typeof _Toast;
export declare const Tooltip: typeof _Tooltip;
export declare const Menu: typeof _Menu;
export declare const Modal: typeof _Modal;
export declare const Tabs: typeof _Tabs;
export declare const Select: typeof _Select;
export declare const CommandPalette: typeof _CommandPalette;
export declare const Form: typeof _Form;
export declare const PhoneInput: typeof _PhoneInput;
export declare const Drawer: typeof _Drawer;
export declare const Autocomplete: typeof _Autocomplete;
export declare const Slider: typeof _Slider;
export declare const Popconfirm: typeof _Popconfirm;
export declare const Segmented: typeof _Segmented;
export declare const Upload: typeof _Upload;
export declare const NumberInput: typeof _NumberInput;
export declare const Progress: typeof _Progress;
export declare const Pagination: typeof _Pagination;
export declare const EmptyState: typeof _EmptyState;
export declare const Rating: typeof _Rating;

declare const kit: {
  VC: typeof _VC;
  VanillaUI: typeof _VC;
  DatePicker: typeof _DatePicker;
  Toast: typeof _Toast;
  Tooltip: typeof _Tooltip;
  Menu: typeof _Menu;
  Modal: typeof _Modal;
  Tabs: typeof _Tabs;
  Select: typeof _Select;
  CommandPalette: typeof _CommandPalette;
  Form: typeof _Form;
  PhoneInput: typeof _PhoneInput;
  Drawer: typeof _Drawer;
  Autocomplete: typeof _Autocomplete;
  Slider: typeof _Slider;
  Popconfirm: typeof _Popconfirm;
  Segmented: typeof _Segmented;
  Upload: typeof _Upload;
  NumberInput: typeof _NumberInput;
  Progress: typeof _Progress;
  Pagination: typeof _Pagination;
  EmptyState: typeof _EmptyState;
  Rating: typeof _Rating;
};
export default kit;
