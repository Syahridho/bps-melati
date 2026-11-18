<?php

namespace Tests\Feature\Settings;

use App\Models\CensoredWord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SensorSettingsAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_redirected_to_login_on_settings_sensors_index()
    {
        $response = $this->get('/settings/sensors');

        $response->assertRedirect('/login');
    }

    public function test_operator_cannot_access_settings_sensors_index()
    {
        $operator = User::factory()->create(['role' => 'operator']);

        $response = $this->actingAs($operator)->get('/settings/sensors');

        $response->assertStatus(403);
    }

    public function test_operator_tim_cannot_access_settings_sensors_index()
    {
        $operatorTim = User::factory()->create(['role' => 'operator_tim']);

        $response = $this->actingAs($operatorTim)->get('/settings/sensors');

        $response->assertStatus(403);
    }

    public function test_admin_can_access_settings_sensors_index()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->get('/settings/sensors');

        $response->assertOk();
    }

    public function test_operator_cannot_store_censored_word()
    {
        $operator = User::factory()->create(['role' => 'operator']);

        $response = $this->actingAs($operator)->post('/settings/sensors', [
            'word' => 'anjing',
            'match_type' => 'anywhere',
            'is_active' => true,
        ]);

        $response->assertStatus(403);
    }

    public function test_operator_tim_cannot_store_censored_word()
    {
        $operatorTim = User::factory()->create(['role' => 'operator_tim']);

        $response = $this->actingAs($operatorTim)->post('/settings/sensors', [
            'word' => 'anjing',
            'match_type' => 'anywhere',
            'is_active' => true,
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_store_censored_word()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->post('/settings/sensors', [
            'word' => 'anjing',
            'match_type' => 'anywhere',
            'is_active' => true,
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('censored_words', ['word' => 'anjing']);
    }

    public function test_operator_cannot_update_censored_word()
    {
        $operator = User::factory()->create(['role' => 'operator']);
        $word = CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);

        $response = $this->actingAs($operator)->put('/settings/sensors/' . $word->id, [
            'word' => 'anjingbaru',
            'match_type' => 'anywhere',
            'is_active' => true,
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('censored_words', ['word' => 'anjing']);
    }

    public function test_operator_tim_cannot_update_censored_word()
    {
        $operatorTim = User::factory()->create(['role' => 'operator_tim']);
        $word = CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);

        $response = $this->actingAs($operatorTim)->put('/settings/sensors/' . $word->id, [
            'word' => 'anjingbaru',
            'match_type' => 'anywhere',
            'is_active' => true,
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('censored_words', ['word' => 'anjing']);
    }

    public function test_admin_can_update_censored_word()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $word = CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);

        $response = $this->actingAs($admin)->put('/settings/sensors/' . $word->id, [
            'word' => 'anjingbaru',
            'match_type' => 'anywhere',
            'is_active' => true,
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('censored_words', ['word' => 'anjingbaru']);
        $this->assertDatabaseMissing('censored_words', ['word' => 'anjing']);
    }

    public function test_operator_cannot_delete_censored_word()
    {
        $operator = User::factory()->create(['role' => 'operator']);
        $word = CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);

        $response = $this->actingAs($operator)->delete('/settings/sensors/' . $word->id);

        $response->assertStatus(403);
        $this->assertDatabaseHas('censored_words', ['word' => 'anjing']);
    }

    public function test_operator_tim_cannot_delete_censored_word()
    {
        $operatorTim = User::factory()->create(['role' => 'operator_tim']);
        $word = CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);

        $response = $this->actingAs($operatorTim)->delete('/settings/sensors/' . $word->id);

        $response->assertStatus(403);
        $this->assertDatabaseHas('censored_words', ['word' => 'anjing']);
    }

    public function test_admin_can_delete_censored_word()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $word = CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);

        $response = $this->actingAs($admin)->delete('/settings/sensors/' . $word->id);

        $response->assertStatus(302);
        $this->assertDatabaseMissing('censored_words', ['word' => 'anjing']);
    }

    public function test_operator_cannot_toggle_censored_word()
    {
        $operator = User::factory()->create(['role' => 'operator']);
        $word = CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);

        $response = $this->actingAs($operator)->patch('/settings/sensors/' . $word->id . '/toggle');

        $response->assertStatus(403);
        $this->assertTrue($word->fresh()->is_active);
    }

    public function test_operator_tim_cannot_toggle_censored_word()
    {
        $operatorTim = User::factory()->create(['role' => 'operator_tim']);
        $word = CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);

        $response = $this->actingAs($operatorTim)->patch('/settings/sensors/' . $word->id . '/toggle');

        $response->assertStatus(403);
        $this->assertTrue($word->fresh()->is_active);
    }

    public function test_admin_can_toggle_censored_word()
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $word = CensoredWord::create(['word' => 'anjing', 'match_type' => 'anywhere', 'is_active' => true]);

        $response = $this->actingAs($admin)->patch('/settings/sensors/' . $word->id . '/toggle');

        $response->assertStatus(302);
        $this->assertFalse($word->fresh()->is_active);
    }

    public function test_operator_cannot_bulk_store_censored_word()
    {
        $operator = User::factory()->create(['role' => 'operator']);

        $response = $this->actingAs($operator)->post('/settings/sensors/bulk', [
            'words' => "kata1\nkata2\nkata3",
            'match_type' => 'anywhere',
            'is_active' => true,
        ]);

        $response->assertStatus(403);
    }

    public function test_admin_can_bulk_store_censored_word()
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $response = $this->actingAs($admin)->post('/settings/sensors/bulk', [
            'words' => "kata1\nkata2\nkata3",
            'match_type' => 'anywhere',
            'is_active' => true,
        ]);

        $response->assertStatus(302);
        $this->assertDatabaseHas('censored_words', ['word' => 'kata1']);
        $this->assertDatabaseHas('censored_words', ['word' => 'kata2']);
        $this->assertDatabaseHas('censored_words', ['word' => 'kata3']);
    }
}
