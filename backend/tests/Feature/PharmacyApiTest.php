<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Brand;
use App\Models\Item;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PharmacyApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test pin login functionality.
     */
    public function test_pin_login_success()
    {
        $user = User::create([
            'name' => 'John Cashier',
            'email' => 'john@pharmacy.com',
            'password' => bcrypt('password'),
            'pin_code' => '9999',
            'role' => 'pharmacist',
        ]);

        $response = $this->postJson('/api/auth/pin', [
            'pin_code' => '9999',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'user' => ['id', 'name', 'pin_code', 'role'],
            ]);

        $this->assertEquals('John Cashier', $response->json('user.name'));
    }

    /**
     * Test pin login invalid behavior.
     */
    public function test_pin_login_invalid()
    {
        $response = $this->postJson('/api/auth/pin', [
            'pin_code' => '0000',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'message' => 'Invalid PIN code.',
            ]);
    }

    /**
     * Test item search logic including name, barcode, and brand name.
     */
    public function test_item_search()
    {
        $user = User::create([
            'name' => 'John',
            'email' => 'john@test.com',
            'password' => bcrypt('password'),
            'pin_code' => '1111',
            'role' => 'super_admin',
        ]);

        $category = Category::create(['name' => 'Analgesics']);
        $brand = Brand::create(['name' => 'Pfizer']);
        
        $item1 = Item::create([
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Aspirin 100mg',
            'pin_number' => '900001',
            'price_per_card' => 5.00,
            'price_per_pill' => 0.50,
            'pills_per_card' => 10,
            'quantity' => 100,
        ]);

        $item2 = Item::create([
            'category_id' => $category->id,
            'name' => 'Paracetamol 500mg',
            'pin_number' => '900002',
            'price_per_card' => 2.50,
            'price_per_pill' => 0.30,
            'pills_per_card' => 12,
            'quantity' => 50,
        ]);

        // Search by name query
        $response = $this->actingAs($user)
            ->getJson('/api/items?search=Aspirin');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Aspirin 100mg', $response->json('data.0.name'));

        // Search by barcode pin query
        $response = $this->actingAs($user)
            ->getJson('/api/items?search=900002');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Paracetamol 500mg', $response->json('data.0.name'));

        // Search by brand name
        $response = $this->actingAs($user)
            ->getJson('/api/items?search=Pfizer');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('Aspirin 100mg', $response->json('data.0.name'));
    }

    /**
     * Test checkout transaction integrity with cards vs pills.
     */
    public function test_checkout_transaction_success()
    {
        $user = User::create([
            'name' => 'John',
            'email' => 'john@test.com',
            'password' => bcrypt('password'),
            'pin_code' => '1111',
            'role' => 'pharmacist',
        ]);

        $category = Category::create(['name' => 'Analgesics']);
        $item = Item::create([
            'category_id' => $category->id,
            'name' => 'Amoxicillin',
            'pin_number' => '900004',
            'price_per_card' => 10.00,
            'price_per_pill' => 2.00,
            'pills_per_card' => 5,
            'quantity' => 20, // 20 pills in stock
            'low_stock_threshold' => 5,
        ]);

        // We purchase 2 cards (which is 10 pills) and 3 pills. Total pills = 13 pills.
        // Cost: 2 cards * 10 = 20.00. 3 pills * 2 = 6.00. Subtotal = 26.00.
        // Discount: 2.00. Tax: 1.50. Net amount: 25.50.
        $payload = [
            'customer_name' => 'Client A',
            'discount' => 2.00,
            'tax' => 1.50,
            'payment_method' => 'Cash',
            'amount_paid' => 30.00,
            'change_amount' => 4.50,
            'items' => [
                [
                    'item_id' => $item->id,
                    'quantity' => 2,
                    'unit' => 'card',
                ],
                [
                    'item_id' => $item->id,
                    'quantity' => 3,
                    'unit' => 'pill',
                ]
            ]
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/invoices', $payload);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'invoice' => [
                    'id', 'invoice_number', 'total_amount', 'discount', 'tax', 'net_amount', 'amount_paid', 'change_amount', 'payment_method'
                ]
            ]);

        // Assert quantity is decremented properly (20 - (2 * 5) - 3 = 7 pills remaining)
        $item->refresh();
        $this->assertEquals(7, $item->quantity);

        // Assert database states are correct
        $this->assertDatabaseHas('invoices', [
            'customer_name' => 'Client A',
            'total_amount' => 26.00,
            'net_amount' => 25.50,
            'amount_paid' => 30.00,
            'change_amount' => 4.50,
        ]);

        $this->assertDatabaseHas('invoice_items', [
            'item_id' => $item->id,
            'quantity' => 2,
            'unit' => 'card',
            'price' => 10.00,
            'subtotal' => 20.00,
        ]);

        $this->assertDatabaseHas('invoice_items', [
            'item_id' => $item->id,
            'quantity' => 3,
            'unit' => 'pill',
            'price' => 2.00,
            'subtotal' => 6.00,
        ]);
    }

    /**
     * Test stock validation & transaction rollback on failure.
     */
    public function test_checkout_fails_when_insufficient_stock()
    {
        $user = User::create([
            'name' => 'John',
            'email' => 'john@test.com',
            'password' => bcrypt('password'),
            'pin_code' => '1111',
            'role' => 'pharmacist',
        ]);

        $category = Category::create(['name' => 'Analgesics']);
        $item = Item::create([
            'category_id' => $category->id,
            'name' => 'Amoxicillin',
            'pin_number' => '900004',
            'price_per_card' => 10.00,
            'price_per_pill' => 2.00,
            'pills_per_card' => 5,
            'quantity' => 4, // Only 4 pills in stock
            'low_stock_threshold' => 5,
        ]);

        $payload = [
            'payment_method' => 'Cash',
            'amount_paid' => 10.00,
            'change_amount' => 0.00,
            'items' => [
                [
                    'item_id' => $item->id,
                    'quantity' => 1,
                    'unit' => 'card', // Needs 5 pills, exceeds available 4
                ]
            ]
        ];

        $response = $this->actingAs($user)
            ->postJson('/api/invoices', $payload);

        // Assert that a validation error is thrown
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['items']);

        // Assert that the stock is NOT decremented due to rollback
        $item->refresh();
        $this->assertEquals(4, $item->quantity);
    }

    /**
     * Test role protection: only super_admin can create/update/delete items.
     */
    public function test_role_protection_for_items()
    {
        $pharmacist = User::create([
            'name' => 'Jane Pharmacist',
            'email' => 'jane@pharmacy.com',
            'password' => bcrypt('password'),
            'role' => 'pharmacist',
        ]);

        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'super@pharmacy.com',
            'password' => bcrypt('password'),
            'role' => 'super_admin',
        ]);

        $category = Category::create(['name' => 'Analgesics']);

        $payload = [
            'category_id' => $category->id,
            'name' => 'Panadol',
            'pin_number' => '882233',
            'price_per_card' => 12.00,
            'price_per_pill' => 1.20,
            'pills_per_card' => 10,
            'quantity' => 50,
            'low_stock_threshold' => 10,
        ];

        // 1. Pharmacist fails to create
        $response = $this->actingAs($pharmacist)
            ->postJson('/api/items', $payload);
        $response->assertStatus(403);

        // 2. Super Admin succeeds in creating
        $response = $this->actingAs($superAdmin)
            ->postJson('/api/items', $payload);
        $response->assertStatus(201);
        $itemId = $response->json('item.id');

        // 3. Pharmacist fails to update
        $response = $this->actingAs($pharmacist)
            ->putJson("/api/items/{$itemId}", array_merge($payload, ['name' => 'Panadol Max']));
        $response->assertStatus(403);

        // 4. Super Admin succeeds in updating
        $response = $this->actingAs($superAdmin)
            ->putJson("/api/items/{$itemId}", array_merge($payload, ['name' => 'Panadol Max']));
        $response->assertStatus(200);
        $this->assertEquals('Panadol Max', $response->json('item.name'));
    }
}
