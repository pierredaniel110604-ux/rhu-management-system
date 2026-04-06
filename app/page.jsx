"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, ShieldPlus } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState("staff");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        router.push("/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "Login failed.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-[#E8EEF8]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        {/* NEW PALETTE: Teal Primary (#0258A4) applied to header */}
        <div className="bg-[#0258A4] px-6 py-10 text-center text-white">
          {/* NEW LOGO: The Calasiao RHU logo is placed prominently */}
          <img 
            src="/logo.jpg" 
            alt="RHU Calasiao Logo" 
            className="w-28 h-28 rounded-full border-8 border-white shadow-xl mx-auto mb-5" 
          />
          <h1 className="text-2xl font-black text-white tracking-tight">RURAL HEALTH UNIT (CALASIAO)</h1>
          <p className="text-white font-medium mt-1 text-sm">Patient Record & Appointment Management</p>
        </div>

        <form onSubmit={handleLogin} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-700 font-medium p-3 rounded-lg text-sm border border-red-200 text-center">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-black mb-2">Select Role</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("staff")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm transition-all ${    role === "staff" ? "border-[#0073C0] bg-blue-50 text-[#0073C0] font-bold ring-2 ring-[#0073C0]" : "border-slate-300 text-black font-semibold hover:bg-slate-100"
                }`}
              >
                <User size={18} className={role === "staff" ? "text-[#0073C0]" : "text-black"} /> Staff
              </button>
              <button
                type="button"
                onClick={() => setRole("doctor")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm transition-all ${
                  role === "doctor" ? "border-[#0073C0] bg-blue-50 text-[#0073C0] font-bold ring-2 ring-[#0073C0]" : "border-slate-300 text-black font-semibold hover:bg-slate-100"
                }`}
              >
                <ShieldPlus size={18} className={role === "doctor" ? "text-[#0073C0]" : "text-black"} /> Doctor
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-1">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#0073C0] focus:border-transparent transition-all placeholder:text-slate-600" 
              placeholder="e.g. admin" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-black mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-lg text-black font-medium focus:outline-none focus:ring-2 focus:ring-[#0073C0] focus:border-transparent transition-all placeholder:text-slate-600" 
              placeholder="••••••••" 
            />
          </div>

          {/* NEW PALETTE: Teal Primary (#0258A4) applied to the button */}
          <button 
            type="submit" 
            className="w-full bg-[#0258A4] hover:bg-[#01478B] text-white py-3 rounded-lg font-bold text-base transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            Sign In to System
          </button>
        </form>
      </div>
    </div>
  );
}