# Petit Budget — version hors ligne (Android)

Appli Expo qui embarque la page « Petit budget Soissons » dans une WebView.
Tout fonctionne sans réseau. Les données (produits, tickets, objectif) restent sur le téléphone.

## Fabriquer l'APK

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

Le profil `preview` sort un **.apk** à installer directement sur les deux téléphones
(lien de téléchargement donné par EAS à la fin du build).
Le profil `production` sort un .aab pour le Play Store.

Paquet Android : `com.frdo1.petitbudget`.

## Fabriquer l'APK sans PC (GitHub Actions)

1. Créer un dépôt GitHub (public, c'est plus simple pour télécharger depuis le téléphone).
2. Y envoyer tout le contenu de ce dossier (sans `node_modules`).
3. Le fichier `.github/workflows/android-apk.yml` lance la compilation à chaque envoi.
   On peut aussi la relancer à la main : onglet **Actions** → « APK Android » → **Run workflow**.
4. Après 10 à 15 minutes : onglet **Releases** du dépôt → télécharger `app-release.apk` sur le téléphone.

## Synchroniser deux téléphones

Onglet « Nos courses » → « Envoyer nos données » → envoyer le message (WhatsApp, SMS…).
Sur l'autre téléphone : coller le message → « Fusionner ». Faire dans les deux sens.
Les achats de chaque téléphone s'additionnent, les tickets ne sont pas dupliqués,
une suppression faite d'un côté est appliquée de l'autre.

## Modifier la page

Les sources sont dans `web/src/` :
- `page-en-ligne.html` : la page (identique à la version en ligne)
- `shim.js` : stockage local qui remplace la base partagée en ligne
- `sync.js` : carte « Synchroniser avec l'autre téléphone »

Après modification, régénérer :

```bash
cd web/src
python3 build.py page-en-ligne.html
cd ../..
node -e "const fs=require('fs');fs.writeFileSync('web/appHtml.js','// Généré depuis app.html — ne pas modifier à la main.\nexport default '+JSON.stringify(fs.readFileSync('web/src/app.html','utf8'))+';\n')"
```
