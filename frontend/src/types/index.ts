export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  admin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Teacher {
  id: number;
  firstName: string;
  lastName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  id: number;
  name: string;
  date: string;
  description: string;
  teacher: Teacher;
  users: number[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  admin: boolean;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SessionFormData {
  name: string;
  date: string;
  description: string;
  teacherId: number | null;
}
