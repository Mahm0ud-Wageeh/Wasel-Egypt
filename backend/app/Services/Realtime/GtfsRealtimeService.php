<?php

namespace App\Services\Realtime;

/**
 * GTFS-Realtime ingestion — ServiceAlert subset.
 *
 * Context (researched 2026-09-07): NO Egyptian agency publishes a
 * GTFS-Realtime feed (verified across the Mobility Database catalog and
 * agency searches — see docs/research/OPEN_SOURCE_AND_API_RESEARCH.md).
 * This service therefore exists to support future feeds without any code
 * changes: point services.gtfs_rt.url at a GTFS-RT ProtocolBuffer feed and
 * run `php artisan gtfsrt:fetch`. When unconfigured it is fully inert and
 * the scheduled-data pipeline is unaffected.
 *
 * ProtocolBuffer parsing is a pure-PHP wire-format reader for the subset
 * of the GTFS-RT schema Wasel consumes (FeedMessage → FeedEntity → Alert
 * → active_period / informed_entity / header_text / description_text).
 * The official google/gtfs-realtime-bindings package requires the protobuf
 * PECL extension, which the XAMPP runtime does not provide; this reader is
 * dependency-free and covered by binary fixture tests.
 */
class GtfsRealtimeService
{
    public function __construct(private readonly ?string $feedUrl = null)
    {
    }

    protected function url(): ?string
    {
        $url = $this->feedUrl
            ?? config('services.gtfs_rt.url', env('GTFS_RT_URL'));

        return ($url !== null && $url !== '') ? $url : null;
    }

    protected function enabled(): bool
    {
        return (bool) config('services.gtfs_rt.enabled', env('GTFS_RT_ENABLED', false))
            && $this->url() !== null;
    }

    /**
     * Fetch and parse the configured GTFS-RT feed into normalized alerts.
     *
     * @return array[] Normalized alert structures (empty when disabled/unreachable/no alerts)
     */
    public function fetchAlerts(): array
    {
        if (!$this->enabled()) {
            return [];
        }

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(10)
                ->withHeaders(['Accept' => 'application/x-protobuf'])
                ->get($this->url());

            if ($response->failed()) {
                \Illuminate\Support\Facades\Log::warning('GTFS-RT fetch failed', [
                    'url' => $this->url(),
                    'status' => $response->status(),
                ]);

                return [];
            }

            return $this->parseFeedMessage($response->body());
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('GTFS-RT fetch error: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Parse a GTFS-RT FeedMessage binary into normalized alert arrays.
     *
     * @param  string  $bytes  Raw ProtocolBuffer bytes
     * @return array[] { gtfs_alert_id, header_text, description_text, active_period_start?, active_period_end?, route_ids[], stop_ids[] }
     */
    public function parseFeedMessage(string $bytes): array
    {
        $alerts = [];

        foreach ($this->readFields($bytes) as $field => $value) {
            if ($field !== 2) {
                continue; // FeedMessage.entity
            }

            $entity = $value;
            $entityId = null;
            $alertBytes = null;

            foreach ($this->readFields($entity) as $ef => $ev) {
                if ($ef === 1) {
                    $entityId = $ev;
                } elseif ($ef === 5) {
                    $alertBytes = $ev; // FeedEntity.alert
                }
            }

            if ($alertBytes === null) {
                continue;
            }

            $alert = $this->parseAlert($alertBytes);
            if ($alert === null) {
                continue;
            }

            $alert['gtfs_alert_id'] = $entityId ?? ($alert['gtfs_alert_id'] ?? uniqid('rt-'));
            $alerts[] = $alert;
        }

        return $alerts;
    }

    protected function parseAlert(string $bytes): ?array
    {
        $alert = [
            'gtfs_alert_id' => null,
            'header_text' => null,
            'description_text' => null,
            'active_period_start' => null,
            'active_period_end' => null,
            'route_ids' => [],
            'stop_ids' => [],
        ];
        $found = false;

        foreach ($this->readFields($bytes) as $field => $value) {
            switch ($field) {
                case 1: // active_period (repeated message)
                    $found = true;
                    $start = null;
                    $end = null;
                    foreach ($this->readFields($value) as $pf => $pv) {
                        if ($pf === 1) {
                            $start = $pv;
                        } elseif ($pf === 2) {
                            $end = $pv;
                        }
                    }
                    $alert['active_period_start'] = $start ?? $alert['active_period_start'];
                    $alert['active_period_end'] = $end ?? $alert['active_period_end'];
                    break;

                case 4: // informed_entity (repeated message)
                    $found = true;
                    foreach ($this->readFields($value) as $ef => $ev) {
                        if ($ef === 1 && $ev !== '') {
                            $alert['route_ids'][] = $ev;
                        } elseif ($ef === 4 && $ev !== '') {
                            $alert['stop_ids'][] = $ev;
                        }
                    }
                    break;

                case 6: // header_text (TranslatedString)
                    $found = true;
                    $alert['header_text'] = $this->readTranslatedString($value) ?? $alert['header_text'];
                    break;

                case 7: // description_text (TranslatedString)
                    $found = true;
                    $alert['description_text'] = $this->readTranslatedString($value) ?? $alert['description_text'];
                    break;
            }
        }

        return $found ? $alert : null;
    }

    /** TranslatedString: repeated Translation { 1: text, 2: language } — prefer Arabic, then first. */
    protected function readTranslatedString(string $bytes): ?string
    {
        $best = null;
        $first = null;

        foreach ($this->readFields($bytes) as $field => $value) {
            if ($field !== 1) {
                continue;
            }

            $text = null;
            $lang = null;
            foreach ($this->readFields($value) as $tf => $tv) {
                if ($tf === 1) {
                    $text = $tv;
                } elseif ($tf === 2) {
                    $lang = $tv;
                }
            }

            if ($text !== null && $first === null) {
                $first = $text;
            }
            if ($text !== null && $lang !== null && stripos($lang, 'ar') === 0) {
                $best = $text;
            }
        }

        return $best ?? $first;
    }

    /**
     * Generic protobuf wire-format reader.
     *
     * @return \Generator<int, string|int> field_number => value (string for
     *                                     length-delimited, int for varint)
     */
    protected function readFields(string $bytes): \Generator
    {
        $pos = 0;
        $len = strlen($bytes);

        while ($pos < $len) {
            [$tag, $pos] = $this->readVarint($bytes, $pos);
            $field = $tag >> 3;
            $wire = $tag & 0x7;

            switch ($wire) {
                case 0: // varint
                    [$value, $pos] = $this->readVarint($bytes, $pos);
                    yield $field => $value;
                    break;

                case 1: // fixed 64-bit
                    yield $field => substr($bytes, $pos, 8);
                    $pos += 8;
                    break;

                case 2: // length-delimited
                    [$size, $pos] = $this->readVarint($bytes, $pos);
                    yield $field => substr($bytes, $pos, $size);
                    $pos += $size;
                    break;

                case 5: // fixed 32-bit
                    yield $field => substr($bytes, $pos, 4);
                    $pos += 4;
                    break;

                default:
                    return; // unknown wire type — corrupt/unsupported group
            }
        }
    }

    protected function readVarint(string $bytes, int $pos): array
    {
        $value = 0;
        $shift = 0;

        while (true) {
            if ($pos >= strlen($bytes)) {
                throw new \RuntimeException('Truncated varint in GTFS-RT payload');
            }

            $byte = ord($bytes[$pos]);
            $pos++;
            $value |= ($byte & 0x7F) << $shift;

            if (($byte & 0x80) === 0) {
                break;
            }

            $shift += 7;
            if ($shift > 63) {
                throw new \RuntimeException('Varint too long in GTFS-RT payload');
            }
        }

        return [$value, $pos];
    }
}
