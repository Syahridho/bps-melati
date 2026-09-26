<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard/admin')->assertRedirect('/login');
        $this->get('/dashboard/operator')->assertRedirect('/login');
    }

    public function test_dashboard_redirects_admins_to_the_admin_dashboard()
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->get('/dashboard')->assertRedirect('/dashboard/admin');
    }

    public function test_dashboard_redirects_operators_to_the_operator_dashboard()
    {
        $this->actingAs(User::factory()->operator()->create());

        $this->get('/dashboard')->assertRedirect('/dashboard/operator');
    }

    public function test_admin_can_visit_the_admin_dashboard()
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->get(route('dashboard.admin.index'))->assertOk();
    }

    public function test_operator_can_visit_the_operator_dashboard()
    {
        $this->actingAs(User::factory()->operator()->create());

        $this->get(route('dashboard.operator.index'))->assertOk();
    }

    public function test_operator_cannot_visit_the_admin_dashboard()
    {
        $this->actingAs(User::factory()->operator()->create());

        $this->get(route('dashboard.admin.index'))->assertForbidden();
    }

    public function test_admin_cannot_visit_the_operator_dashboard()
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->get(route('dashboard.operator.index'))->assertForbidden();
    }

    public function test_operator_cannot_visit_admin_pages()
    {
        $this->actingAs(User::factory()->operator()->create());

        $this->get(route('dashboard.admin.input-data.index'))->assertForbidden();
        $this->get(route('dashboard.admin.laporan-masuk.index'))->assertForbidden();
        $this->get(route('dashboard.admin.laporan-selesai.index'))->assertForbidden();
        $this->get(route('dashboard.admin.rekap-bulanan.index'))->assertForbidden();
        $this->get(route('dashboard.admin.rekap-semesteran.index'))->assertForbidden();
        $this->get(route('dashboard.admin.rekap-tahunan.index'))->assertForbidden();
    }

    public function test_admin_can_visit_admin_pages()
    {
        $this->actingAs(User::factory()->admin()->create());

        $this->get(route('dashboard.admin.input-data.index'))->assertOk();
        $this->get(route('dashboard.admin.laporan-masuk.index'))->assertOk();
        $this->get(route('dashboard.admin.laporan-selesai.index'))->assertOk();
        $this->get(route('dashboard.admin.rekap-bulanan.index'))->assertOk();
        $this->get(route('dashboard.admin.rekap-semesteran.index'))->assertOk();
        $this->get(route('dashboard.admin.rekap-tahunan.index'))->assertOk();
    }
}
