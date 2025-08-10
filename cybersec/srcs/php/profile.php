<?php
require_once 'vendor/autoload.php';
require_once 'auth.php';

header('Content-Type: application/json');

$payload = require_auth(); // 🔐 Authentifie le JWT

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

    echo json_encode(['user' => $user]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur']);
}

// require_once 'jwt.php';

// header('Content-Type: application/json');

// $headers = getallheaders();
// $authHeader = $headers['Authorization'] ?? '';

// if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
//     http_response_code(401);
//     echo json_encode(['error' => 'Token manquant ou mal formaté']);
//     exit;
// }

// $token = trim(str_replace('Bearer', '', $authHeader));

// try {
//     $payload = validate_jwt($token);
//     $userId = $payload->id;

//     $db = new PDO('sqlite:/var/www/html/data/users.sqlite');
//     $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

//     $stmt = $db->prepare("SELECT id, email, created_at FROM users WHERE id = :id");
//     $stmt->execute([':id' => $userId]);
//     $user = $stmt->fetch(PDO::FETCH_ASSOC);

//     if (!$user) {
//         http_response_code(404);
//         echo json_encode(['error' => 'Utilisateur introuvable']);
//         exit;
//     }

//     echo json_encode(['user' => $user]);

// } catch (Exception $e) {
//     http_response_code(401);
//     echo json_encode(['error' => 'Token invalide ou expiré']);
// }
