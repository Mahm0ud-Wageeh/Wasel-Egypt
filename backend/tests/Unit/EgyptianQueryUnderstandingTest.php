<?php

namespace Tests\Unit;

use App\Services\Search\EgyptianQueryUnderstandingService;
use PHPUnit\Framework\TestCase;

class EgyptianQueryUnderstandingTest extends TestCase
{
    private EgyptianQueryUnderstandingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new EgyptianQueryUnderstandingService();
    }

    public function test_full_natural_egyptian_query(): void
    {
        $res = $this->service->parse('أنا في فيصل وعايز أروح جامعة القاهرة');
        $this->assertTrue($res['is_natural_query']);
        $this->assertEquals('فيصل', $res['origin']);
        $this->assertEquals('جامعة القاهرة', $res['destination']);
    }

    public function test_prepositional_query(): void
    {
        $res = $this->service->parse('من الفيوم لميدان الجيزة');
        $this->assertTrue($res['is_natural_query']);
        $this->assertEquals('الفيوم', $res['origin']);
        $this->assertEquals('ميدان الجيزة', $res['destination']);
    }

    public function test_question_query(): void
    {
        $res = $this->service->parse('ازاي اروح التحرير من رمسيس؟');
        $this->assertTrue($res['is_natural_query']);
        $this->assertEquals('رمسيس', $res['origin']);
        $this->assertEquals('التحرير', $res['destination']);
    }

    public function test_direct_shorthand(): void
    {
        $res = $this->service->parse('فيصل للجيزة');
        $this->assertTrue($res['is_natural_query']);
        $this->assertEquals('فيصل', $res['origin']);
        $this->assertEquals('الجيزة', $res['destination']);
    }

    public function test_avoid_metro_preference(): void
    {
        $res = $this->service->parse('أنا في فيصل وعايز أروح جامعة القاهرة من غير مترو');
        $this->assertEquals('فيصل', $res['origin']);
        $this->assertEquals('جامعة القاهرة', $res['destination']);
        $this->assertContains('metro', $res['preferences']['avoid_modes']);
    }

    public function test_cheapest_and_least_walking(): void
    {
        $res = $this->service->parse('عايز أرخص طريق ومش عايز أمشي كتير');
        $this->assertEquals('cheapest', $res['preferences']['ranking']);
        $this->assertTrue($res['preferences']['least_walking']);
    }

    public function test_luggage(): void
    {
        $res = $this->service->parse('معايا شنط أركب إيه من رمسيس للمطار؟');
        $this->assertTrue($res['preferences']['luggage']);
        $this->assertEquals('رمسيس', $res['origin']);
        $this->assertEquals('المطار', $res['destination']);
    }

    public function test_nearest_metro(): void
    {
        $res = $this->service->parse('أقرب محطة مترو');
        $this->assertEquals('nearest_metro', $res['intent']);
        $this->assertTrue($res['is_natural_query']);
    }

    public function test_english(): void
    {
        $res = $this->service->parse('Faisal to Cairo University');
        $this->assertTrue($res['is_natural_query']);
        $this->assertEquals('Faisal', $res['origin']);
        $this->assertEquals('Cairo University', $res['destination']);
    }

    public function test_arabizi(): void
    {
        $res = $this->service->parse('ana fe faisal w 3ayez aro7 cairo university');
        $this->assertTrue($res['is_natural_query']);
        $this->assertEquals('faisal', $res['origin']);
        $this->assertEquals('cairo university', $res['destination']);
    }
}
