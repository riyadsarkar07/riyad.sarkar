export type Language = "en" | "bn";

export interface Stat {
  value: number;
  suffix: string;
  labelKey: string;
  decimals?: number;
}

export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  features: string[];
  gradient: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
  skills: string[];
  type: "work" | "milestone" | "education";
}

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  date: string;
  credentialId: string;
  verifyUrl: string;
  icon: string;
}

export interface Achievement {
  id: string;
  value: number;
  suffix: string;
  title: string;
  description: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  avatarColor: string;
  rating: number;
  text: string;
  case: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: number;
  category: string;
  cover: string;
  content: string[];
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  gradient: string;
  icon: string;
}

export interface Tool {
  name: string;
  category: string;
  level: number;
  icon: string;
}

export interface ConsultationInputs {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  message: string;
}

export interface ContactFormInputs {
  name: string;
  email: string;
  projectType: string;
  budget?: string;
  timeline?: string;
  message: string;
  website?: string;
}
