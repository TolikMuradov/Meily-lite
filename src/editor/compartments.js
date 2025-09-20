import { Compartment } from '@codemirror/state';

export const languageCompartment = new Compartment();
export const themeCompartment = new Compartment();
export const keymapCompartment = new Compartment();
export const tableCompartment = new Compartment();
export const pluginCompartment = new Compartment();

export function buildBaseKeymap(ext) {
  return keymapCompartment.of(ext);
}
