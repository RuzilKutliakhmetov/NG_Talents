"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register as registerUser } from "@/features/auth/api";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas/auth";
import { normalizeApiError } from "@/lib/api/api-error";

export function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      middleName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerUser({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        middleName: values.middleName || undefined,
        phone: values.phone || undefined,
      });
      toast.success("Аккаунт создан. Теперь можно войти в систему.");
      const returnTo = new URLSearchParams(window.location.search).get(
        "returnTo",
      );
      const query = returnTo
        ? `?returnTo=${encodeURIComponent(returnTo)}`
        : "";
      router.push(`/login${query}`);
    } catch (error) {
      const apiError = normalizeApiError(error);
      toast.error(apiError.message || "Не удалось создать аккаунт.");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Имя</Label>
          <Input id="firstName" placeholder="Иван" {...register("firstName")} />
          {errors.firstName ? (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Фамилия</Label>
          <Input id="lastName" placeholder="Иванов" {...register("lastName")} />
          {errors.lastName ? (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="middleName">Отчество (необязательно)</Label>
        <Input id="middleName" placeholder="Иванович" {...register("middleName")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
        {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Телефон (необязательно)</Label>
        <Input id="phone" type="tel" placeholder="+7 999 123 45 67" {...register("phone")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Минимум 8 символов"
            {...register("password")}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Повторите пароль"
            {...register("confirmPassword")}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={showConfirmPassword ? "Скрыть пароль" : "Показать пароль"}
            onClick={() => setShowConfirmPassword((value) => !value)}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Создаём аккаунт..." : "Создать аккаунт"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Уже есть аккаунт?{" "}
        <button
          type="button"
          className="font-medium text-primary"
          onClick={() => {
            const returnTo = new URLSearchParams(window.location.search).get(
              "returnTo",
            );
            const query = returnTo
              ? `?returnTo=${encodeURIComponent(returnTo)}`
              : "";
            router.push(`/login${query}`);
          }}
        >
          Войти
        </button>
      </p>
    </form>
  );
}
