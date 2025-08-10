<?php
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

$JWT_SECRET = 'super-secret-key'; // à sécuriser avec Vault plus tard

function generate_jwt($data) {
    global $JWT_SECRET;

    $payload = array_merge($data, [
        'iat' => time(),              // Issued At
        'exp' => time() + 3600        // Expire dans 1h
    ]);

    return JWT::encode($payload, $JWT_SECRET, 'HS256');
}

function validate_jwt($token) {
    global $JWT_SECRET;
    return JWT::decode($token, new Key($JWT_SECRET, 'HS256'));
}
