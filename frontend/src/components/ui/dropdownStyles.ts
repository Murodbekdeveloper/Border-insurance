// Shared by Combobox and SearchableSelect's dropdown panels — both
// implement the same "input + filtered list" pattern independently (one
// allows freeform entry, the other only an id-backed selection, which is
// why they're two components rather than one), but previously copy-pasted
// these exact class strings, so a visual fix to one silently never reached
// the other. Pull any future shared behavior fix here too before adding it
// to just one of the two files.
export const DROPDOWN_INPUT_CLASS =
  'w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export const DROPDOWN_PANEL_CLASS =
  'absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900';

export const DROPDOWN_OPTION_CLASS =
  'block w-full px-4 py-2 text-left text-sm hover:bg-orange-50 dark:hover:bg-slate-800';

export const DROPDOWN_OPTION_SELECTED_CLASS =
  'bg-orange-50 font-semibold text-orange-700 dark:bg-slate-800 dark:text-orange-400';

export const DROPDOWN_OPTION_UNSELECTED_CLASS = 'text-slate-700 dark:text-slate-300';
