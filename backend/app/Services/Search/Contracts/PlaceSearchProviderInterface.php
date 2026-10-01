<?php

namespace App\Services\Search\Contracts;

/**
 * Interface PlaceSearchProviderInterface
 *
 * Contract for place search providers (LocalVerified, GooglePlaces, Photon/OSM).
 */
interface PlaceSearchProviderInterface
{
    /**
     * Unique identifier for the provider (e.g. 'local', 'google', 'photon').
     */
    public function name(): string;

    /**
     * Whether this provider is configured and available for queries.
     */
    public function isAvailable(): bool;

    /**
     * Search places by query, optionally biased by coordinates.
     *
     * @param string $query
     * @param float|null $biasLat
     * @param float|null $biasLng
     * @param int $limit
     * @return array[] List of normalized place arrays { id, name, detail, lat, lng, type, source, confidence }
     */
    public function search(string $query, ?float $biasLat = null, ?float $biasLng = null, int $limit = 6): array;
}

