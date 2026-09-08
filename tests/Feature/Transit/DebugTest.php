<?php

namespace Tests\Feature\Transit;

use App\Models\Schedule;
use App\Models\RouteVariant;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DebugTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function debug_schedule_response()
    {
        $this->assertTrue(true);
    }
}