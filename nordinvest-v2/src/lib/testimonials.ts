/*
 * Real quotes from real users, added only with their permission (name as they
 * agreed to be shown). Empty = the section is not rendered anywhere. Never
 * write a placeholder or an invented quote here.
 */
export type Testimonial = {
  quote: string;
  name: string; // "Mette H." or full name, as agreed
  role?: string; // "privat udlejer, Aarhus"
  date: string; // YYYY-MM-DD the quote was given
};

export const testimonials: Testimonial[] = [];
