<?php

namespace Tests\Feature\Incidents;

use App\Models\IncidentReport;
use App\Models\IncidentVote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class IncidentTrustScoreTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected int $stopId;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        $operatorId = DB::table('transit_operators')->insertGetId([
            'name' => 'Cairo Metro',
            'code' => 'CM',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $modeId = DB::table('transit_modes')->insertGetId([
            'name' => 'Metro',
            'code' => 'metro',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $govId = DB::table('governorates')->insertGetId([
            'name' => 'Cairo',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $areaId = DB::table('areas')->insertGetId([
            'name' => 'Downtown',
            'governorate_id' => $govId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->stopId = DB::table('transit_stops')->insertGetId([
            'name' => 'Sadat Station',
            'latitude' => 30.0444,
            'longitude' => 31.2357,
            'area_id' => $areaId,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** @test */
    public function initial_report_has_baseline_trust_score()
    {
        $report = IncidentReport::create([
            'user_id' => $this->user->id,
            'transit_stop_id' => $this->stopId,
            'kind' => 'crowd',
            'severity' => 'med',
            'description' => 'زحام شديد على رصيف حلوان',
            'status' => 'pending',
            'confirms' => 0,
            'denies' => 0,
            'trust_score' => 1.0,
        ]);

        $this->assertEquals(1.0, $report->trust_score);
        $this->assertEquals('pending', $report->status);
    }

    /** @test */
    public function confirm_votes_increase_trust_score_and_verify_incident()
    {
        $report = IncidentReport::create([
            'user_id' => $this->user->id,
            'transit_stop_id' => $this->stopId,
            'kind' => 'crowd',
            'severity' => 'high',
            'description' => 'عطل في السلم المتحرك',
            'status' => 'pending',
            'confirms' => 0,
            'denies' => 0,
            'trust_score' => 1.0,
        ]);

        // Create 3 confirms from 3 different users
        for ($i = 0; $i < 3; $i++) {
            $voter = User::factory()->create();
            IncidentVote::create([
                'incident_report_id' => $report->id,
                'user_id' => $voter->id,
                'vote' => 'confirm',
            ]);
        }

        $report->recalculateVotes();
        $report->refresh();

        $this->assertEquals(3, $report->confirms);
        $this->assertEquals(0, $report->denies);
        // (3 + 1) / (3 + 2) = 4/5 = 0.8
        $this->assertEquals(0.8, $report->trust_score);
        $this->assertEquals('confirmed', $report->status);
    }

    /** @test */
    public function deny_votes_reduce_trust_score_and_mark_disputed()
    {
        $report = IncidentReport::create([
            'user_id' => $this->user->id,
            'transit_stop_id' => $this->stopId,
            'kind' => 'safety',
            'severity' => 'high',
            'description' => 'بلاغ كاذب عن توقف المحطة',
            'status' => 'pending',
            'confirms' => 0,
            'denies' => 0,
            'trust_score' => 1.0,
        ]);

        // Create 3 denies from 3 different users
        for ($i = 0; $i < 3; $i++) {
            $voter = User::factory()->create();
            IncidentVote::create([
                'incident_report_id' => $report->id,
                'user_id' => $voter->id,
                'vote' => 'deny',
            ]);
        }

        $report->recalculateVotes();
        $report->refresh();

        $this->assertEquals(0, $report->confirms);
        $this->assertEquals(3, $report->denies);
        // (0 + 1) / (3 + 2) = 1/5 = 0.2
        $this->assertEquals(0.2, $report->trust_score);
        $this->assertEquals('dismissed', $report->status);
    }
}
