# Soccer Tracker

Track matches, squad, and player stats. Data is stored in localStorage by default and can be synced to Supabase.

## Supabase (optional)

To persist data in Supabase:

1. **Create a project** at [supabase.com](https://supabase.com) and get your project URL and anon key from **Project Settings → API**.

2. **Run the migration** in the Supabase **SQL Editor**. Paste and run the contents of `supabase/migrations/20260211000000_create_app_state.sql`. This creates the `app_state` table and policies so the app can read/write one row of JSON state.

3. **Configure env** in the project root:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `VITE_SUPABASE_URL` — your project URL  
   - `VITE_SUPABASE_ANON_KEY` — your anon (public) key  

4. Restart the dev server. The app will load and save to Supabase; if env vars are missing, it continues to use only localStorage.

---

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
