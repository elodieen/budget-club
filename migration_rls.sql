-- 1. pgcrypto : hachage bcrypt côté base (crypt / gen_salt).
-- Sur Supabase, les extensions s'installent par défaut dans le schéma
-- "extensions", pas "public" — d'où la qualification explicite ci-dessous
-- plutôt que de compter sur le search_path.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Fonctions serveur : le hash ne quitte jamais la base, la comparaison
-- se fait entièrement côté serveur. SECURITY DEFINER = s'exécute avec les
-- privilèges du propriétaire de la fonction, indépendamment des restrictions
-- appliquées à l'appelant (anon) sur la table elle-même.
-- search_path reste limité à "public" par sécurité ; crypt()/gen_salt()
-- sont donc appelées avec le préfixe "extensions." explicite.

CREATE OR REPLACE FUNCTION create_profile_with_pin(p_id text, p_name text, p_pin text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO profiles (id, name, pin_hash)
  VALUES (p_id, p_name, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)));
$$;

CREATE OR REPLACE FUNCTION set_profile_pin(p_id text, p_pin text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 10))
  WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION verify_profile_pin(p_id text, p_pin text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pin_hash IS NOT NULL AND pin_hash = extensions.crypt(p_pin, pin_hash)
  FROM profiles
  WHERE id = p_id;
$$;

GRANT EXECUTE ON FUNCTION create_profile_with_pin(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION set_profile_pin(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_profile_pin(text, text) TO anon, authenticated;

-- 3. Verrouillage de la table : on retire tout accès direct, puis on ne
-- rouvre que la lecture des colonnes non sensibles (id/name/auth_user_id),
-- nécessaires à l'app pour vérifier si un profil est "Supabase-natif" ou
-- lié à un compte Auth. pin_hash devient illisible et non modifiable en
-- direct, quelle que soit la requête envoyée depuis le client.

REVOKE ALL ON profiles FROM anon, authenticated;
GRANT SELECT (id, name, auth_user_id) ON profiles TO anon, authenticated;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lecture id/name/auth_user_id uniquement" ON profiles;
CREATE POLICY "lecture id/name/auth_user_id uniquement" ON profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);
