export interface ContactFormValues {
  name: string;
  phone: string;
  storeName: string;
  email: string;
  businessType: string;
  message: string;
  website: string; // honeypot: debe llegar siempre vacio
}

export type ContactFormState = {
  ok: boolean;
  message: string;
  fieldErrors: Record<string, string>;
};

export const INITIAL_CONTACT_FORM_STATE: ContactFormState = {
  ok: false,
  message: "",
  fieldErrors: {},
};
