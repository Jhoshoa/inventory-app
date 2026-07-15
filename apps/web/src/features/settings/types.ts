export interface StoreResponse {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface StoreFormValues {
  name: string;
  address: string;
  phone: string;
}

export type StoreEditorState = {
  ok: boolean;
  message: string;
  fieldErrors: Record<string, string>;
};
