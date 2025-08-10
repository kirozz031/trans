<?php
require_once '../vendor/autoload.php';
require_once '../auth.php';

header('Content-Type: application/json');

$payload = require_auth(); // 🔐 Authentifie l'utilisateur via JWT

try {
    $db = new PDO('sqlite:/var/www/html/data/users.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Génère un email et mot de passe anonymes
    $anonEmail = 'anonymous_' . $payload['id'] . '@example.com';
    $anonPassword = password_hash(bin2hex(random_bytes(10)), PASSWORD_DEFAULT);

    $stmt = $db->prepare("UPDATE users SET email = :email, password = :password, is_2fa_enabled = 0, twofa_secret = NULL WHERE id = :id");
    $stmt->execute([
        ':email' => $anonEmail,
        ':password' => $anonPassword,
        ':id' => $payload['id']
    ]);

    echo json_encode(['message' => 'Compte anonymisé avec succès']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
}
