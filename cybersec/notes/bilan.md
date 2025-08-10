# 🔐 Bilan des fonctionnalités Cybersécurité – Projet Web

## ✅ Authentification

| Fonctionnalité                        | Statut | Détail |
|--------------------------------------|--------|--------|
| Authentification par email + mot de passe | ✅ | Hash sécurisé (bcrypt via `password_hash()`) |
| Authentification via JWT             | ✅ | Jeton signé, stocké côté client (`localStorage`) |
| Vérification du JWT sur les routes protégées | ✅ | Via `require_auth()` dans `auth.php` |
| Route `/me.php`                      | ✅ | Donne les infos de l’utilisateur connecté |

## 🔒 Double authentification (2FA)

| Fonctionnalité                  | Statut | Détail |
|--------------------------------|--------|--------|
| Activation 2FA par utilisateur | ✅ | Via `enable_2fa.php` avec QR code Google Authenticator |
| Vérification du code 2FA       | ✅ | Intégrée dans `login.php` avec `verifyCode()` |
| Codes TOTP valides ±60s        | ✅ | Période personnalisée (60s + marge) |

## 🧼 RGPD – Gestion des données utilisateur

| Fonctionnalité                    | Statut | Détail |
|----------------------------------|--------|--------|
| Suppression de compte (`delete_account.php`) | ✅ | Supprime les données de l'utilisateur |
| Anonymisation (`anonymize_account.php`) | ✅ | Remplace email, désactive accès, supprime le 2FA |
| Boutons frontend liés            | ✅ | Présents dans `login.html` avec confirmation |

## 🧩 Frontend sécurisé (`login.html`)

| Élément                          | Statut | Détail |
|----------------------------------|--------|--------|
| Stockage du JWT en localStorage  | ✅ | Persistance côté client |
| Chargement automatique du profil | ✅ | Via `/me.php` après login |
| Bouton déconnexion               | ✅ | Supprime le JWT et redirige |
| Gestion des erreurs (formulaires) | ✅ | Affichage dynamique des erreurs serveur |

## 🛡️ Web Application Firewall – ModSecurity

| Fonctionnalité                | Statut | Détail |
|------------------------------|--------|--------|
| ModSecurity activé sur Nginx | ✅ | Activé via Dockerfile + config personnalisée |
| Protection XSS               | ✅ | Requête avec `<script>` renvoie `403` |
| Protection SQLi              | ✅ | `' OR 1=1` bloqué via règle personnalisée |
| Logs d’audit activés         | ✅ | Fichier `/var/log/modsec_audit.log` monté depuis l’hôte |
| Lecture et filtrage des logs | ✅ | Lecture manuelle ou grep `"Access denied"` |

## 📁 Docker et structure

| Élément                         | Statut | Détail |
|---------------------------------|--------|--------|
| Services séparés (PHP, Nginx)   | ✅ | Conteneurs distincts, communication via `docker-compose` |
| Nginx reverse proxy sécurisé    | ✅ | Support de ModSecurity intégré |
| Configuration centralisée       | ✅ | Fichiers `modsecurity.conf`, `nginx.conf` personnalisés |
| Volumes montés pour logs        | ✅ | Logs accessibles sur l’hôte pour vérification |