<?php
return [
    'database' => [
        'mysql' => [
            'host' => 'localhost',
            'dbname' => 'ecoride_db',
            'username' => 'root',
            'password' => '',
            'charset' => 'utf8mb4'
        ],
        'mongodb' => [
            'uri' => 'mongodb://localhost:27017',
            'database' => 'ecoride_nosql'
        ]
    ],
    'app' => [
        'base_url' => 'http://localhost:8000',
        'secret_key' => 'change-this-secret-key',
        'environment' => 'development',
        'debug' => true
    ],
    'security' => [
        'password_min_length' => 8,
        'session_lifetime' => 3600,
        'csrf_token_name' => 'csrf_token'
    ]
];