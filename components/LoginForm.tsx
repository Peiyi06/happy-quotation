"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"login"|"signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        router.push("/dashboard");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) setMessage(error.message);
      else setMessage("账号已创建。若系统要求邮箱验证，请先完成验证再登录。");
    }
    setLoading(false);
  }

  return (
    <div className="auth-shell">
      <div className="auth-brand">
        <div className="eyebrow">HAPPY EXPRESS TRAVEL</div>
        <h1>Sales Quotation Workspace</h1>
        <p>内部报价、利润与团型管理系统</p>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-switch">
          <button type="button" className={mode==="login"?"active":""} onClick={()=>setMode("login")}>Login</button>
          <button type="button" className={mode==="signup"?"active":""} onClick={()=>setMode("signup")}>Create Account</button>
        </div>
        {mode==="signup" && (
          <label className="field"><span>姓名</span><input required value={fullName} onChange={e=>setFullName(e.target.value)} /></label>
        )}
        <label className="field"><span>Email</span><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label className="field"><span>Password</span><input type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} /></label>
        {message && <div className="auth-message">{message}</div>}
        <button className="btn primary auth-submit" disabled={loading}>{loading ? "Please wait..." : mode==="login" ? "Login" : "Create Account"}</button>
        <p className="auth-note">第一个注册账号会自动成为 Manager，其后的新账号默认是 Sales。</p>
      </form>
    </div>
  );
}
