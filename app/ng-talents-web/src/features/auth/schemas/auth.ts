import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Введите корректный email."),
  password: z.string().min(1, "Введите пароль."),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "Введите имя."),
    lastName: z.string().trim().min(1, "Введите фамилию."),
    middleName: z.string().trim().optional(),
    email: z.string().trim().email("Введите корректный email."),
    phone: z.string().trim().optional().or(z.literal("")),
    password: z.string().min(8, "Пароль должен содержать минимум 8 символов."),
    confirmPassword: z.string().min(1, "Подтвердите пароль."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают.",
    path: ["confirmPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
