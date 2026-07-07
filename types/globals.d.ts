/**
 * Ambient globals for script-tag users.
 *
 * Reference this file (or add `"vanilla-ui-kit/types/globals"` to your
 * tsconfig `types`) when loading the kit via `<script src>` so the browser
 * globals type-check:
 *
 *   /// <reference types="vanilla-ui-kit/types/globals" />
 *   Toast.success('Saved');
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

declare global {
  var VC: typeof _VC;
  var VanillaUI: typeof _VC;
  var DatePicker: typeof _DatePicker;
  var Toast: typeof _Toast;
  var Tooltip: typeof _Tooltip;
  var Menu: typeof _Menu;
  var Modal: typeof _Modal;
  var Tabs: typeof _Tabs;
  var Select: typeof _Select;
  var CommandPalette: typeof _CommandPalette;
  var Form: typeof _Form;
  var PhoneInput: typeof _PhoneInput;
  var Drawer: typeof _Drawer;
  var Autocomplete: typeof _Autocomplete;
  var Slider: typeof _Slider;
  var Popconfirm: typeof _Popconfirm;
  var Segmented: typeof _Segmented;
  var Upload: typeof _Upload;
  var NumberInput: typeof _NumberInput;
  var Progress: typeof _Progress;
  var Pagination: typeof _Pagination;
  var EmptyState: typeof _EmptyState;
  var Rating: typeof _Rating;
}

export {};
