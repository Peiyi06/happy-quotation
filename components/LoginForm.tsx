"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const loginName = username.trim().toLowerCase();
    const email = loginName + "@happyexpress.internal";
    const authPassword = password + "HE!";
    const { error } = await supabase.auth.signInWithPassword({ email, password: authPassword });

    if (error) {
      setMessage("Login name or password is incorrect.");
    } else {
      router.push("/dashboard");
      router.refresh();
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
        <div className="auth-title">
          <h2>Staff Login</h2>
          <p>仅限 Happy Express Travel 内部员工</p>
        </div>
        <label className="field">
          <span>Login Name</span>
          <input autoComplete="username" required value={username} onChange={e=>setUsername(e.target.value)} placeholder="例如：jess" />
        </label>
        <label className="field">
          <span>Password</span>
          <input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} />
        </label>
        {message && <div className="auth-message">{message}</div>}
        <button className="btn primary auth-submit" disabled={loading}>
          {loading ? "Signing in..." : "Login"}
        </button>
        <p className="auth-note">员工账号由 Manager 在系统内部建立，外部无法自行注册。</p>
      </form>
    </div>
  );
}
