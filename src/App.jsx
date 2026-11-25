
import { useState } from 'react';
import AuthPage from './components/AuthPage';

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  const [session, setSession] = useState(null);

  function handleAuthenticated(session) {
    setSession(session);
    setLoggedIn(true);
  }

  if (loggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-emerald-400">
          Login successful!
        </h1>

        <p className="mt-4 text-slate-300">
          Welcome to AlgoArena!
        </p>

        <button
          onClick={() => {
            setLoggedIn(false);
            setSession(null);
          }}
          className="mt-6 rounded-lg bg-emerald-500 px-6 py-3 text-black font-semibold"
        >
          Log out
        </button>
      </div>
    );
  }

  return <AuthPage onAuthenticated={handleAuthenticated} />;
}

export default App;
