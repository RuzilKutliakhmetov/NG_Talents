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
import { login } from "@/features/auth/api";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/auth";
import { getLoginRedirectRoute } from "@/features/applications/lib";
import { normalizeApiError } from "@/lib/api/api-error";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const user = await login(values);
      const route = getLoginRedirectRoute(user.role, window.location.search);
      toast.success("Вход выполнен успешно.");
      router.replace(route);
    } catch (error) {
      const apiError = normalizeApiError(error);
      toast.error(apiError.message || "Не удалось выполнить вход.");
    }
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email ? (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password ? (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Входим..." : "Войти"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Нет аккаунта?{" "}
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
            router.push(`/register${query}`);
          }}
        >
          Зарегистрироваться
        </button>
      </p>
    </form>
  );
}
