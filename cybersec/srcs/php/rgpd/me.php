<?php
require_once '../vendor/autoload.php';
require_once '../auth.php';

header('Content-Type: application/json');

$payload = require_auth(); // 🔐 vérifie le token

try {
    $db = new PDO('sqlite:/var/www/html/data/users.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $db->prepare("SELECT id, email, created_at FROM users WHERE id = :id");
    $stmt->execute([':id' => $payload['id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'Utilisateur introuvable']);
        exit;
    }

    echo json_encode(['me' => $user]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}
