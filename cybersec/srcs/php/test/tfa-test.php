<?php
require_once 'vendor/autoload.php';

use RobThree\Auth\TwoFactorAuth;
use RobThree\Auth\Providers\Qr\BaconQrCodeProvider;
use RobThree\Auth\Algorithm;

$tfa = new TwoFactorAuth(
    new BaconQrCodeProvider(),
    'FT_TRANSCENDENCE',
    6,
    30,
    Algorithm::Sha1
);

echo "✅ OK";
