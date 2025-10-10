<?php
namespace EcoRide\Services;

/**
 * Service pour calculer les itinéraires et durées via OpenRouteService
 * API gratuite : https://openrouteservice.org/
 * Limite : 2000 requêtes/jour
 */
class RouteService {

    private $apiKey;
    private $baseUrl = 'https://api.openrouteservice.org';
    private $redis;

    public function __construct() {
        // Clé API OpenRouteService (gratuite)
        // Pour obtenir une clé : https://openrouteservice.org/dev/#/signup
        $this->apiKey = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImM2M2FmYjAwZjM5NDRjNmVhZTEyODIwMGExMDMxZWNkIiwiaCI6Im11cm11cjY0In0=';
        //$this->apiKey = $_ENV['OPENROUTE_API_KEY'] ?? '';

        // Connexion Redis pour le cache (optionnel)
        $this->redis = null;
        try {
            if (class_exists('\Redis')) {
                $redis = new \Redis();
                $redisHost = $_ENV['REDIS_HOST'] ?? 'redis';
                $redisPort = $_ENV['REDIS_PORT'] ?? 6379;

                if ($redis->connect($redisHost, $redisPort)) {
                    $redisPassword = $_ENV['REDIS_PASSWORD'] ?? 'redisMDP8_';
                    if ($redisPassword && $redis->auth($redisPassword)) {
                        $this->redis = $redis;
                    }
                }
            }
        } catch (\Throwable $e) {
            // Cache désactivé en cas d'erreur
            $this->redis = null;
        }
    }

    /**
     * Géocoder une ville (convertir nom de ville en coordonnées lat/lon)
     */
    public function geocode($cityName) {
        $cacheKey = 'geocode:' . strtolower(trim($cityName));

        // Vérifier le cache Redis
        if ($this->redis) {
            $cached = $this->redis->get($cacheKey);
            if ($cached) {
                return json_decode($cached, true);
            }
        }

        $url = $this->baseUrl . '/geocode/search?api_key=' . $this->apiKey . '&text=' . urlencode($cityName) . '&boundary.country=FR';
        $response = @file_get_contents($url);

        if ($response === false) {
            return null;
        }

        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            return null;
        }

        if (isset($data['features'][0]['geometry']['coordinates'])) {
            $coords = $data['features'][0]['geometry']['coordinates'];

            $result = [
                'lon' => $coords[0],
                'lat' => $coords[1]
            ];

            // Stocker en cache Redis (30 jours)
            if ($this->redis) {
                $this->redis->setex($cacheKey, 30 * 24 * 60 * 60, json_encode($result));
            }

            return $result;
        }

        return null;
    }

    /**
     * Calculer la durée d'un trajet entre deux villes
     * @return int Durée en minutes
     */
    public function calculateDuration($fromCity, $toCity) {
        $routeCacheKey = 'route:' . strtolower(trim($fromCity)) . ':' . strtolower(trim($toCity));

        // Vérifier le cache Redis pour l'itinéraire complet
        if ($this->redis) {
            $cached = $this->redis->get($routeCacheKey);
            if ($cached !== false) {
                return (int)$cached;
            }
        }

        // Géocoder les villes
        $fromCoords = $this->geocode($fromCity);
        $toCoords = $this->geocode($toCity);

        if (!$fromCoords || !$toCoords) {
            return null;
        }

        // Calculer l'itinéraire
        $url = $this->baseUrl . '/v2/directions/driving-car';

        $postData = [
            'coordinates' => [
                [$fromCoords['lon'], $fromCoords['lat']],
                [$toCoords['lon'], $toCoords['lat']]
            ]
        ];

        $options = [
            'http' => [
                'header'  => [
                    "Content-Type: application/json",
                    "Authorization: " . $this->apiKey
                ],
                'method'  => 'POST',
                'content' => json_encode($postData),
                'ignore_errors' => true
            ]
        ];

        $context  = stream_context_create($options);
        $response = @file_get_contents($url, false, $context);

        if ($response === false) {
            return null;
        }

        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE || isset($data['error'])) {
            return null;
        }

        if (isset($data['routes'][0]['summary']['duration'])) {
            $durationSeconds = $data['routes'][0]['summary']['duration'];
            $durationMinutes = round($durationSeconds / 60);

            // Stocker en cache Redis (30 jours)
            if ($this->redis) {
                $this->redis->setex($routeCacheKey, 30 * 24 * 60 * 60, $durationMinutes);
            }

            return $durationMinutes;
        }

        return null;
    }

    /**
     * Calculer l'heure d'arrivée estimée
     */
    public function calculateArrivalTime($fromCity, $toCity, $departureDate, $departureTime) {
        $durationMinutes = $this->calculateDuration($fromCity, $toCity);

        if ($durationMinutes === null) {
            // Fallback : estimation de 2h si le calcul échoue
            $durationMinutes = 120;
        }

        $departureDateTime = new \DateTime($departureDate . ' ' . $departureTime);
        $arrivalDateTime = clone $departureDateTime;
        $arrivalDateTime->add(new \DateInterval('PT' . $durationMinutes . 'M'));

        return [
            'arrival_datetime' => $arrivalDateTime->format('Y-m-d H:i:s'),
            'duration_minutes' => $durationMinutes
        ];
    }
}
