
-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY
        REFERENCES auth.users(id) ON DELETE CASCADE,

    username TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT username_format
        CHECK (username ~ '^[A-Za-z0-9_]{3,20}$')
);

-- 2. Make usernames unique
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_unique
ON public.profiles (LOWER(username));

-- 3. Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profiles
FROM anon, authenticated;

GRANT ALL ON TABLE public.profiles TO service_role;

-- 4. Create signup trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'username'
    );

    RETURN NEW;
END;
$$;

-- 5. Create signup trigger
DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 6. Refresh the API schema cache
NOTIFY pgrst, 'reload schema';




SELECT *
FROM public.profiles;





CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_username TEXT;
BEGIN
    new_username :=
        NEW.raw_user_meta_data ->> 'username';

    -- Insert a profile only when a username is provided
    IF new_username IS NOT NULL
       AND length(trim(new_username)) > 0 THEN

        INSERT INTO public.profiles (id, username)
        VALUES (
            NEW.id,
            trim(new_username)
        );

    END IF;

    RETURN NEW;
END;
$$;





INSERT INTO public.profiles (id, username)
VALUES (
    '87e48b55-2e70-4c79-97b9-37783bb7f516',
    'Hello_123'
);



SELECT
    p.id,
    p.username,
    u.email,
    u.email_confirmed_at
FROM public.profiles p
JOIN auth.users u
    ON p.id = u.id;








SELECT
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'profiles';





SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;



SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'profiles';





SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'users';



SELECT
    trigger_name,
    event_object_schema,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
AND event_object_table = 'users';



SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n
    ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
AND p.proname = 'handle_new_user';




SELECT
    p.id,
    p.username,
    u.email,
    u.email_confirmed_at
FROM public.profiles p
JOIN auth.users u
    ON p.id = u.id
ORDER BY p.created_at DESC;



SELECT
    id,
    email,
    email_confirmed_at,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC;


SELECT
    id,
    email,
    email_confirmed_at,
    raw_user_meta_data
FROM auth.users
WHERE email = 'algotest123@gmail.com';