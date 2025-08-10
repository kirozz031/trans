<?php
require_once 'vendor/autoload.php';
require_once 'jwt.php';

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\BaconQrCodeProvider;
use RobThree\Auth\Algorithm;

// 🔧 Afficher les erreurs proprement en JSON
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
        exit;
    }

    $data = json_decode(file_get_contents("php://input"), true);
    if (!isset($data['email'], $data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Email et mot de passe requis']);
        exit;
    }

    $db = new PDO('sqlite:/var/www/html/data/users.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $stmt = $db->prepare("SELECT * FROM users WHERE email = :email");
    $stmt->execute([':email' => $data['email']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || !password_verify($data['password'], $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Identifiants invalides']);
        exit;
    }

    if ($user['is_2fa_enabled']) {
        if (empty($data['code'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Code 2FA requis']);
            exit;
        }

        $tfa = new TwoFactorAuth(
            new BaconQrCodeProvider(),
            'FT_TRANSCENDENCE',
            6,
            60,
            Algorithm::Sha1
        );

        // $tfa->verifyCode($secret, $code, 1); // marge ±60s (total 2 minutes)
        $isValid = $tfa->verifyCode($user['twofa_secret'], $data['code'], 1);

        if (!$isValid) {
            http_response_code(401);
            echo json_encode(['error' => 'Code 2FA invalide']);
            exit;
        }
    }

    $token = generate_jwt(['id' => $user['id'], 'email' => $user['email']]);
    echo json_encode(['token' => $token]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erreur serveur : ' . $e->getMessage()]);
    exit;
}
