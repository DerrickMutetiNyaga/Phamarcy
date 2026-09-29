"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Field, FormError } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { loginSchema } from "@/lib/validators/auth";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const { redirectTo } = await apiFetch<{ redirectTo: string }>("/api/auth/login", { method: "POST", body: values });
      router.replace(next ?? redirectTo);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="username" autoFocus {...form.register("email")} aria-invalid={!!errors.email} />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...form.register("password")}
          aria-invalid={!!errors.password}
        />
      </Field>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
