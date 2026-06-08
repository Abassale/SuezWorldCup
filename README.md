# Suez World Cup - V28 Supabase + Vercel

Cette version n'utilise plus Render.

## Dossiers

```txt
frontend/
  index.html
  styles.css
  app.js
  config.js
  suez-logo.png

supabase/
  schema.sql
```

## Déploiement

1. Créer un projet Supabase.
2. Aller dans SQL Editor.
3. Coller le contenu de `supabase/schema.sql`.
4. Aller dans Project Settings > API.
5. Copier :
   - Project URL
   - anon public key
6. Mettre ces valeurs dans `frontend/config.js`.
7. Envoyer le projet sur GitHub.
8. Importer le repo dans Vercel.
9. Root Directory : `frontend`.
10. Build Command : vide.
11. Output Directory : `.`

## Admin

```txt
Pseudo : Admin
Mot de passe : Admin
```

## Note sécurité

Cette version est pensée pour un usage interne entre collègues.
Elle utilise Supabase directement depuis le frontend. Pour un usage public important, il faudrait ajouter un vrai backend ou des règles RLS plus strictes.
