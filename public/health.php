<?php
// Health check ultra-simple pour Railway
header('Content-Type: application/json');
header('Cache-Control: no-cache');

echo json_encode([
    'status' => 'ok',
    'timestamp' => date('c'),
    'php_version' => PHP_VERSION,
    'server_port' => $_SERVER['SERVER_PORT'] ?? 'unknown'
]);
?>