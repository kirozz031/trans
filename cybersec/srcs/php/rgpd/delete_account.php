<?php
require_once '../vendor/autoload.php';
require_once '../auth.php';

header('Content-Type: application/json');

$payload = require_auth(); // 🔐 Authentifie via JWT

try {
    $db = new PDO('sqlite:/var/www/html/data/users.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
    $stmt->execute([':id' => $payload['id']]);

    echo json_encode(['message' => 'Compte supprimé avec succès']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
}
