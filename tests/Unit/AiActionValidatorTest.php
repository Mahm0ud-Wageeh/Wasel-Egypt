<?php

namespace Tests\Unit;

use App\Services\Ai\AiActionValidator;
use PHPUnit\Framework\TestCase;

class AiActionValidatorTest extends TestCase
{
    private AiActionValidator $validator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->validator = new AiActionValidator;
    }

    public function test_keeps_whitelisted_actions_with_valid_params(): void
    {
        $result = $this->validator->validate([
            ['type' => 'set_origin', 'params' => ['stop_id' => '12', 'name' => 'Tahrir', 'latitude' => '30.04', 'longitude' => 31.2]],
            ['type' => 'switch_map_layer', 'params' => ['layer' => 'satellite']],
        ]);

        $this->assertCount(2, $result);
        $this->assertSame(12, $result[0]['params']['stop_id']);
        $this->assertSame(30.04, $result[0]['params']['latitude']);
        $this->assertSame('satellite', $result[1]['params']['layer']);
    }

    public function test_drops_unknown_action_types(): void
    {
        $result = $this->validator->validate([
            ['type' => 'delete_database', 'params' => []],
            ['type' => 'open_route', 'params' => ['route_id' => 5]],
            'not an action',
            null,
        ]);

        $this->assertCount(1, $result);
        $this->assertSame('open_route', $result[0]['type']);
    }

    public function test_drops_actions_missing_required_params(): void
    {
        $result = $this->validator->validate([
            ['type' => 'open_route', 'params' => []],
            ['type' => 'open_route', 'params' => ['route_id' => 'abc']],
            ['type' => 'focus_map_location', 'params' => ['latitude' => 30.0, 'longitude' => 31.0]],
        ]);

        $this->assertCount(1, $result);
        $this->assertSame('focus_map_location', $result[0]['type']);
        $this->assertArrayNotHasKey('zoom', $result[0]['params']); // optional param omitted
    }

    public function test_optional_params_with_bad_types_are_dropped_not_fatal(): void
    {
        $result = $this->validator->validate([
            ['type' => 'set_origin', 'params' => ['stop_id' => 3, 'name' => ['not', 'a', 'string']]],
        ]);

        $this->assertCount(1, $result);
        $this->assertSame(3, $result[0]['params']['stop_id']);
        $this->assertArrayNotHasKey('name', $result[0]['params']);
    }

    public function test_caps_actions_at_maximum(): void
    {
        $flood = array_fill(0, 20, ['type' => 'open_fare', 'params' => []]);

        $this->assertCount(AiActionValidator::MAX_ACTIONS, $this->validator->validate($flood));
    }

    public function test_accepts_action_alias_key_and_non_array_input(): void
    {
        $this->assertSame([], $this->validator->validate('junk'));
        $this->assertSame([], $this->validator->validate(null));

        $result = $this->validator->validate([['action' => 'open_fare']]);
        $this->assertCount(1, $result);
        $this->assertSame('open_fare', $result[0]['type']);
    }
}
