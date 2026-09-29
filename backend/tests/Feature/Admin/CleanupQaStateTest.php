<?php

namespace Tests\Feature\Admin;

use App\Models\Journey;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

/**
 * QA-state cleanup command: only pattern-matching test accounts and their
 * artifacts are removed. The seeded admin and non-matching accounts are
 * never touched, even when they own data.
 */
class CleanupQaStateTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seeded-style admin + a real-looking account — must survive.
        User::factory()->create(['email' => 'admin@example.com']);
        User::factory()->create(['email' => 'nadia.hassan@gmail.com']);

        // QA artifacts — must go.
        $qa = User::factory()->create(['email' => 'qa12345@example.com']);
        $e2e = User::factory()->create(['email' => 'e2e991@example.com']);
        User::factory()->create(['email' => 'someone@mailinator.com']);
        User::factory()->create(['email' => 'qaprobe053937@example.com']);

        Journey::factory()->count(3)->create(['user_id' => $qa->id]);
        Journey::factory()->create(['user_id' => $e2e->id]);
        Notification::create([
            'user_id' => $qa->id,
            'title' => 'Journey started',
            'body' => 'test',
            'sent_via' => 'inapp',
            'sent_at' => now(),
            'priority' => 'normal',
        ]);
    }

    /** @test */
    public function dry_run_deletes_nothing_but_reports_qa_accounts()
    {
        $this->artisan('wasel:cleanup-qa-state', ['--dry-run' => true])
            ->expectsOutputToContain('Dry run — nothing was deleted.')
            ->assertSuccessful();

        $this->assertSame(6, User::count());
        $this->assertSame(4, Journey::count());
    }

    /** @test */
    public function cleanup_removes_only_pattern_matching_test_accounts()
    {
        $this->artisan('wasel:cleanup-qa-state', ['--force' => true])
            ->assertSuccessful();

        $this->assertSame(2, User::count()); // admin + real-looking account
        $this->assertDatabaseHas('users', ['email' => 'admin@example.com']);
        $this->assertDatabaseHas('users', ['email' => 'nadia.hassan@gmail.com']);
        $this->assertDatabaseMissing('users', ['email' => 'qa12345@example.com']);

        $this->assertSame(0, Journey::count());
        $this->assertSame(0, Notification::count());
    }

    /** @test */
    public function cleanup_is_a_noop_when_no_test_accounts_exist()
    {
        User::whereIn('email', ['qa12345@example.com', 'e2e991@example.com', 'someone@mailinator.com', 'qaprobe053937@example.com'])->forceDelete();

        $this->artisan('wasel:cleanup-qa-state', ['--force' => true])
            ->expectsOutputToContain('Nothing to clean — no test accounts found.')
            ->assertSuccessful();

        $this->assertSame(2, User::count());
    }
}
