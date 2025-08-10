<?php
require_once 'vendor/autoload.php';
require_once 'jwt.php'; // contient generate_jwt() et validate_jwt()

function require_auth(): array {
    $headers = getallheaders();
    if (!isset($headers['Authorization'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Token manquant']);
        exit;
    }

    if (!preg_match('/Bearer\s(\S+)/', $headers['Authorization'], $matches)) {
        http_response_code(401);
        echo json_encode(['error' => 'Format du token invalide']);
        exit;
    }

    $token = $matches[1];
    $payload = validate_jwt($token);

    if (!$payload) {
        http_response_code(401);
        echo json_encode(['error' => 'Token invalide ou expiré']);
        exit;
    }

    return (array) $payload;
}
