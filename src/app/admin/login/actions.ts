"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/env";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Vui lòng nhập email.").email("Email không hợp lệ."),
  password: z.string().min(1, "Vui lòng nhập mật khẩu."),
});

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  if (isDemoMode) {
    return {
      error:
        "Chưa cấu hình Supabase nên chưa thể đăng nhập. Hãy thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY vào .env.local.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Thông tin đăng nhập không hợp lệ." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    // We surface our own copy and never leak whether the account exists.
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Không xác thực được tài khoản." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile as { role: string }).role !== "admin") {
    await supabase.auth.signOut();
    return { error: "Tài khoản này không có quyền quản trị." };
  }

  redirect("/admin");
}

export async function logoutAction() {
  if (isDemoMode) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}