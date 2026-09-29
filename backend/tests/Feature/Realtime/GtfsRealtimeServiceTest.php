<?php

namespace Tests\Feature\Realtime;

use App\Services\Realtime\GtfsRealtimeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * GTFS-Realtime ingestion: pure-PHP protobuf wire reader against binary
 * fixtures of the ServiceAlert subset. This is the future-feed interface —
 * no Egyptian GTFS-RT feed exists today (documented), so correctness is
 * proven against crafted protocol-correct payloads.
 */
class GtfsRealtimeServiceTest extends TestCase
{
    use RefreshDatabase;

    // ---- protobuf encoding helpers (mirror the official wire format) ----

    private function varint(int $n): string
    {
        $out = '';
        while ($n >= 0x80) {
            $out .= chr(($n & 0x7F) | 0x80);
            $n >>= 7;
        }

        return $out . chr($n);
    }

    private function field(int $number, int $wire, string $payload): string
    {
        return $this->varint(($number << 3) | $wire) . $payload;
    }

    private function len(int $number, string $bytes): string
    {
        return $this->field($number, 2, $this->varint(strlen($bytes)) . $bytes);
    }

    private function str(int $number, string $value): string
    {
        return $this->len($number, $value);
    }

    private function buildFeed(array $alerts): string
    {
        $entities = '';
        $i = 0;
        foreach ($alerts as $alert) {
            $alertBytes = '';
            // TranslatedString = repeated Translation { 1: text, 2: language }
            if (!empty($alert['header'])) {
                $translation = $this->str(1, $alert['header']) . $this->str(2, $alert['lang'] ?? 'en');
                $alertBytes .= $this->len(6, $this->len(1, $translation));
            }
            if (!empty($alert['description'])) {
                $translation = $this->str(1, $alert['description']) . $this->str(2, $alert['lang'] ?? 'en');
                $alertBytes .= $this->len(7, $this->len(1, $translation));
            }
            if (!empty($alert['route_id'])) {
                $alertBytes .= $this->len(4, $this->str(1, $alert['route_id']));
            }
            if (!empty($alert['stop_id'])) {
                $alertBytes .= $this->len(4, $this->str(4, $alert['stop_id']));
            }
            if (!empty($alert['start'])) {
                // TimeRange { 1: start (varint), 2: end (varint) }
                $alertBytes .= $this->len(1,
                    $this->field(1, 0, $this->varint($alert['start'])) .
                    $this->field(2, 0, $this->varint($alert['start'] + 3600))
                );
            }

            $entity = $this->str(1, $alert['id']) . $this->len(5, $alertBytes);
            $entities .= $this->len(2, $entity);
            $i++;
        }

        // FeedHeader: field 3 (timestamp) varint
        $header = $this->field(3, 0, $this->varint(1788700000));

        return $header . $entities;
    }

    /** @test */
    public function parses_a_service_alert_feed_into_normalized_alerts()
    {
        $bytes = $this->buildFeed([
            [
                'id' => 'RT-TEST-1',
                'header' => 'Line 1 delayed',
                'description' => 'Trains run ~10 minutes late between Helwan and El Marg.',
                'route_id' => 'L1',
                'start' => 1788700000,
            ],
        ]);

        $service = new GtfsRealtimeService();
        $alerts = $service->parseFeedMessage($bytes);

        $this->assertCount(1, $alerts);
        $this->assertSame('RT-TEST-1', $alerts[0]['gtfs_alert_id']);
        $this->assertSame('Line 1 delayed', $alerts[0]['header_text']);
        $this->assertSame(['L1'], $alerts[0]['route_ids']);
        $this->assertSame(1788700000, $alerts[0]['active_period_start']);
    }

    /** @test */
    public function prefers_arabic_translations_when_present()
    {
        $bytes = $this->buildFeed([
            [
                'id' => 'RT-AR-1',
                'header' => 'Line 1 interrupted',
                'lang' => 'ar',
            ],
        ]);

        $alerts = (new GtfsRealtimeService())->parseFeedMessage($bytes);

        $this->assertSame('Line 1 interrupted', $alerts[0]['header_text']);
    }

    /** @test */
    public function collects_route_and_stop_entities()
    {
        $bytes = $this->buildFeed([
            [
                'id' => 'RT-TEST-2',
                'header' => 'Stop closure',
                'route_id' => 'L2',
                'stop_id' => 'osm-N11495591794',
            ],
        ]);

        $alerts = (new GtfsRealtimeService())->parseFeedMessage($bytes);

        $this->assertSame(['L2'], $alerts[0]['route_ids']);
        $this->assertSame(['osm-N11495591794'], $alerts[0]['stop_ids']);
    }

    /** @test */
    public function is_inert_when_unconfigured()
    {
        // default env: no GTFS_RT_URL
        $service = new GtfsRealtimeService();

        $this->assertSame([], $service->fetchAlerts());
    }

    /** @test */
    public function fetch_failure_returns_empty_not_exception()
    {
        config(['services.gtfs_rt.url' => 'http://127.0.0.1:59996', 'services.gtfs_rt.enabled' => true]);

        $service = new GtfsRealtimeService('http://127.0.0.1:59996');

        $this->assertSame([], $service->fetchAlerts());
    }

    /** @test */
    public function fetch_parses_a_live_protobuf_response()
    {
        $bytes = $this->buildFeed([
            ['id' => 'RT-LIVE-1', 'header' => 'Maintenance', 'route_id' => 'L1'],
        ]);

        config(['services.gtfs_rt.enabled' => true]);
        Http::fake([
            'rt.example.com/*' => Http::response($bytes, 200, ['Content-Type' => 'application/x-protobuf']),
        ]);

        $service = new GtfsRealtimeService('http://rt.example.com/feed');
        $alerts = $service->fetchAlerts();

        $this->assertCount(1, $alerts);
        $this->assertSame('RT-LIVE-1', $alerts[0]['gtfs_alert_id']);
    }
}
