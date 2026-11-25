
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

export default {
  fetch: withSupabase(
    { auth: "publishable" },
    async (req, ctx) => {

      console.log("REQUEST RECEIVED");

      // 1. Check HTTP method
      if (req.method !== "POST") {
        console.log("ERROR: Invalid HTTP method");

        return Response.json(
          { error: "Method not allowed" },
          { status: 405 }
        );
      }

      try {
        // 2. Read request body
        console.log("STEP 1: Reading request body");

        const body = await req.json();
        const { username, password } = body;

        console.log("STEP 1 COMPLETE: Request body received");

        // 3. Validate input
        if (
          typeof username !== "string" ||
          typeof password !== "string" ||
          !/^[A-Za-z0-9_]{3,20}$/.test(username) ||
          password.length === 0 ||
          password.length > 128
        ) {
          console.log("ERROR: Invalid input");

          return Response.json(
            { error: "Invalid username or password" },
            { status: 400 }
          );
        }

        // 4. Find username in profiles
        console.log("STEP 2: Searching profiles table");

        const { data: profile, error: profileError } =
          await ctx.supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("username", username)
            .maybeSingle();

        console.log("STEP 2 RESULT:", {
          profileFound: !!profile,
          error: profileError?.message ?? null,
          errorCode: profileError?.code ?? null
        });

        if (profileError || !profile) {
          return Response.json(
            { error: "Invalid username or password" },
            { status: 401 }
          );
        }

        // 5. Retrieve user from Supabase Auth
        console.log("STEP 3: Retrieving user from Auth");

        const { data: userResult, error: userError } =
          await ctx.supabaseAdmin.auth.admin.getUserById(
            profile.id
          );

        console.log("STEP 3 RESULT:", {
          userFound: !!userResult?.user,
          error: userError?.message ?? null,
          errorCode: userError?.status ?? null
        });

        const email = userResult?.user?.email;

        if (userError || !email) {
          return Response.json(
            { error: "Invalid username or password" },
            { status: 401 }
          );
        }

        // 6. Verify password using Supabase Auth
        console.log("STEP 4: Verifying password");

        const { data: authData, error: authError } =
          await ctx.supabase.auth.signInWithPassword({
            email,
            password
          });

        console.log("STEP 4 RESULT:", {
          sessionCreated: !!authData?.session,
          error: authError?.message ?? null
        });

        if (authError || !authData.session) {
          return Response.json(
            { error: "Invalid username or password" },
            { status: 401 }
          );
        }

        // 7. Return session
        console.log("LOGIN SUCCESSFUL");

        return Response.json({
          session: authData.session
        });

      } catch (error) {
        console.error("LOGIN FUNCTION ERROR:", error);

        return Response.json(
          { error: "Unable to process login" },
          { status: 500 }
        );
      }
    }
  )
};
