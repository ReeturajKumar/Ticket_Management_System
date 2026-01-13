import * as z from "zod"

// Registration form validation schema
export const signUpSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces")
    .transform((val) => val.trim().replace(/\s+/g, " ")),
  
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .transform((val) => val.trim()),
  
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must not exceed 100 characters"),
})

// OTP verification validation schema (4 digits)
export const otpSchema = z.object({
  otp: z
    .string()
    .min(1, "OTP is required")
    .length(4, "OTP must be 4 digits")
    .regex(/^\d{4}$/, "OTP must contain only numbers")
    .transform((val) => val.trim()),
})

// Login form validation schema
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .toLowerCase()
    .transform((val) => val.trim()),
  
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
})

export type SignUpFormData = z.infer<typeof signUpSchema>
export type OTPFormData = z.infer<typeof otpSchema>
export type LoginFormData = z.infer<typeof loginSchema>
