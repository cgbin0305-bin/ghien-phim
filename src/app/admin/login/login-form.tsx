"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "@/app/admin/login/actions";

const schema = z.object({
  email: z.string().trim().min(1, "Vui lòng nhập email.").email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const [serverState, setServerState] = React.useState<LoginState>({});

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerState({});
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    const result = await loginAction({}, formData);
    if (result?.error) setServerState(result);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          placeholder="admin@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-rouge-300">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="text-xs text-rouge-300">
            {errors.password.message}
          </p>
        )}
      </div>

      {serverState.error && (
        <p
          role="alert"
          className="rounded-md border border-rouge-500/40 bg-rouge-500/10 px-3 py-2 text-sm text-rouge-300"
        >
          {serverState.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden="true" />
            Đang đăng nhập…
          </>
        ) : (
          <>
            <LogIn aria-hidden="true" />
            Đăng nhập
          </>
        )}
      </Button>
    </form>
  );
}