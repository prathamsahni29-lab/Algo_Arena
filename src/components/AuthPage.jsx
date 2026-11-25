import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'At least one uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'At least one lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'num', label: 'At least one number (0-9)', test: (p) => /[0-9]/.test(p) },
  { id: 'special', label: 'At least one special character (!@#$%^&* etc.)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState([]);
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRuleErrors, setShowRuleErrors] = useState(false);
  const [uStatus, setUStatus] = useState('idle');

  const ruleResults = PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) }));
  const passwordValid = ruleResults.every((r) => r.ok);



  useEffect(() => {
    if (mode !== 'signup') return;
    if (!username) return setUStatus('idle');
    if (!USERNAME_RE.test(username)) return setUStatus('invalid');
    setUStatus('checking');
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data, error } = await supabase.rpc('is_username_available', { p_username: username });
      if (cancelled) return;
      setUStatus(error ? 'idle' : data ? 'available' : 'taken');
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [username, mode]);



  function switchMode(next) {
    setMode(next);
    setErrors([]);
    setInfo('');
    setShowRuleErrors(false);
    setPassword('');
  }

  




async function handleLogin(e) {
  e.preventDefault();

  setErrors([]);
  setInfo('');

  if (!username.trim() || !password) {
    return setErrors(['Enter your username and password.']);
  }

  setBusy(true);

  try {
    // Call our username-login Edge Function
    const { data, error } = await supabase.functions.invoke(
      'username-login',
      {
        body: {
          username: username.trim(),
          password: password,
        },
      }
    );

    if (error || !data?.session) {
      return setErrors(['Invalid username or password.']);
    }

    // Save the returned session in the React Supabase client
    const { data: sessionData, error: sessionError } =
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

    if (sessionError) {
      return setErrors(['Unable to establish login session.']);
    }

    // Login successful
    onAuthenticated?.(sessionData.session);

  } catch (error) {
    console.error('Login error:', error);
    setErrors(['Something went wrong. Please try again.']);

  } finally {
    setBusy(false);
  }
}





  async function handleSignup(e) {
    e.preventDefault();
    setErrors([]);
    setInfo('');
    const problems = [];

    if (!EMAIL_RE.test(email.trim())) problems.push('Enter a valid email address.');
    if (!USERNAME_RE.test(username))
      problems.push('Username must be 3-20 characters: letters, numbers and underscores only.');
    else if (uStatus === 'taken') problems.push('That username is already taken.');

    if (!passwordValid) {
      setShowRuleErrors(true);
    } else {
      setShowRuleErrors(false);
    }
    if (problems.length || !passwordValid) return setErrors(problems);

    setBusy(true);
    try {
      const { data: free } = await supabase.rpc('is_username_available', { p_username: username });
      if (free === false) {
        setUStatus('taken');
        return setErrors(['That username is already taken.']);
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { username },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        if (/database error/i.test(error.message)) return setErrors(['That username is already taken.']);
        return setErrors([error.message]);
      }
      // Supabase returns a user with no identities when the email is already registered
      if (data.user && data.user.identities?.length === 0)
        return setErrors(['An account with this email already exists. Try logging in.']);

      setMode('verify');
    } finally {
      setBusy(false);
    }
  }


  
  async function resendVerification() {
    setErrors([]);
    setInfo('');
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setErrors([error.message]);
    else setInfo('Verification email sent again. Check your inbox (and spam folder).');
  }

  const inputCls =
    'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Algo<span className="text-emerald-400">Arena</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">Real-time 1v1 competitive programming</p>
        </div>

        {mode === 'verify' ? (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-semibold text-white">Verify your email</h2>
            <p className="text-sm text-slate-300">
              We sent a verification link to <span className="font-medium text-emerald-400">{email}</span>. Click it to
              activate your account, then log in.
            </p>
            {info && <p className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-300">{info}</p>}
            {errors.length > 0 && <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">{errors[0]}</p>}
            <button
              onClick={resendVerification}
              className="w-full rounded-lg border border-slate-700 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
            >
              Resend verification email
            </button>
            <button onClick={() => switchMode('login')} className="text-sm text-emerald-400 hover:underline">
              Back to login
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-800 p-1 text-sm font-medium">
              {['login', 'signup'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`rounded-md py-2 transition ${
                    mode === m ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4" noValidate>
              {mode === 'signup' && (
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputCls}
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm text-slate-300">Username</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="coder_123"
                  className={inputCls}
                />
                {mode === 'signup' && (
                  <p
                    className={`mt-1 text-xs ${
                      uStatus === 'available'
                        ? 'text-emerald-400'
                        : uStatus === 'taken' || uStatus === 'invalid'
                        ? 'text-red-400'
                        : 'text-slate-500'
                    }`}
                  >
                    {uStatus === 'checking' && 'Checking availability...'}
                    {uStatus === 'available' && '✓ Username is available'}
                    {uStatus === 'taken' && '✗ Username is already taken'}
                    {uStatus === 'invalid' && '✗ 3-20 characters: letters, numbers, underscores only'}
                    {uStatus === 'idle' && '3-20 characters: letters, numbers, underscores'}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputCls} pr-16`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute inset-y-0 right-3 text-xs text-slate-400 hover:text-white"
                  >
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>

                {mode === 'signup' && (
                  <ul className="mt-2 space-y-1 rounded-lg bg-slate-800/60 p-3 text-xs">
                    <li className="mb-1 font-medium text-slate-300">Password must contain:</li>
                    {ruleResults.map((r) => (
                      <li
                        key={r.id}
                        className={r.ok ? 'text-emerald-400' : showRuleErrors ? 'text-red-400' : 'text-slate-400'}
                      >
                        {r.ok ? '✓' : '•'} {r.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {mode === 'signup' && showRuleErrors && !passwordValid && (
                <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300" role="alert">
                  <p className="mb-1 font-medium">Your password does not meet these conditions:</p>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {PASSWORD_RULES.map((r) => (
                      <li key={r.id}>{r.label}</li>
                    ))}
                  </ul>
                </div>
              )}

              {errors.length > 0 && (
                <div className="rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300" role="alert">
                  {errors.map((er) => (
                    <p key={er}>{er}</p>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {busy ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-400">
              {mode === 'login' ? "New to AlgoArena? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="text-emerald-400 hover:underline"
              >
                {mode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
