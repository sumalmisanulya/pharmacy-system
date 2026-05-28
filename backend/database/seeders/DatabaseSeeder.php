<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Brand;
use App\Models\Item;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Users
        User::create([
            'name' => 'Super Admin',
            'email' => 'superadmin@pharmacy.com',
            'password' => Hash::make('superpassword'),
            'pin_code' => '1234', // Super Admin PIN code
            'role' => 'super_admin',
        ]);

        User::create([
            'name' => 'Admin Cashier',
            'email' => 'admin@pharmacy.com',
            'password' => Hash::make('adminpassword'),
            'pin_code' => '2222', // Standard Admin PIN code
            'role' => 'admin',
        ]);

        User::create([
            'name' => 'Jane Pharmacist',
            'email' => 'pharmacist@pharmacy.com',
            'password' => Hash::make('pharmacistpassword'),
            'pin_code' => '5555',
            'role' => 'pharmacist',
        ]);

        // 2. Seed Brands
        $brandsData = [
            'GlaxoSmithKline (GSK)',
            'Pfizer',
            'Abbott Laboratories',
            'Roche',
            'Bayer',
            'Novartis',
            'Sanofi',
            'Cipla',
            'Sun Pharma',
            'AstraZeneca',
        ];

        $brands = [];
        foreach ($brandsData as $name) {
            $brands[$name] = Brand::create(['name' => $name]);
        }

        // 3. Seed Categories
        $categoriesData = [
            'Analgesics (Pain Relievers)',
            'Antibiotics',
            'Antihistamines (Allergy)',
            'Antipyretics (Fever Reducers)',
            'Cardiovascular (Heart/BP)',
            'Antidiabetics',
            'Gastrointestinal (Stomach/Digestion)',
            'Vitamins & Supplements',
            'Dermatologicals (Skin/Ointments)',
            'Respiratory/Cough & Cold',
        ];

        $categories = [];
        foreach ($categoriesData as $name) {
            $categories[$name] = Category::create(['name' => $name]);
        }

        // 4. Seed Items (Medicines)
        // Storing quantities as total pills: card_count * pills_per_card
        $items = [
            [
                'category' => 'Analgesics (Pain Relievers)',
                'brand' => 'GlaxoSmithKline (GSK)',
                'name' => 'Paracetamol 500mg',
                'pin_number' => '90000001',
                'pills_per_card' => 12,
                'price_per_card' => 30.00,
                'price_per_pill' => 3.00,
                'cards_count' => 12, // 144 pills total
                'low_stock_threshold' => 24, // 2 cards alert level
            ],
            [
                'category' => 'Analgesics (Pain Relievers)',
                'brand' => 'Cipla',
                'name' => 'Ibuprofen 400mg',
                'pin_number' => '90000002',
                'pills_per_card' => 10,
                'price_per_card' => 40.00,
                'price_per_pill' => 4.50,
                'cards_count' => 8, // 80 pills total
                'low_stock_threshold' => 20,
            ],
            [
                'category' => 'Analgesics (Pain Relievers)',
                'brand' => 'Bayer',
                'name' => 'Aspirin 81mg',
                'pin_number' => '90000003',
                'pills_per_card' => 10,
                'price_per_card' => 18.00,
                'price_per_pill' => 2.00,
                'cards_count' => 1, // 10 pills total (Low Stock Alert)
                'low_stock_threshold' => 15,
            ],
            [
                'category' => 'Antibiotics',
                'brand' => 'Pfizer',
                'name' => 'Amoxicillin 500mg',
                'pin_number' => '90000004',
                'pills_per_card' => 6,
                'price_per_card' => 72.00,
                'price_per_pill' => 13.00,
                'cards_count' => 7, // 42 pills total
                'low_stock_threshold' => 12,
            ],
            [
                'category' => 'Antibiotics',
                'brand' => 'Sanofi',
                'name' => 'Azithromycin 250mg',
                'pin_number' => '90000005',
                'pills_per_card' => 6,
                'price_per_card' => 110.00,
                'price_per_pill' => 20.00,
                'cards_count' => 5, // 30 pills total
                'low_stock_threshold' => 10,
            ],
            [
                'category' => 'Antihistamines (Allergy)',
                'brand' => 'Cipla',
                'name' => 'Cetirizine 10mg',
                'pin_number' => '90000006',
                'pills_per_card' => 10,
                'price_per_card' => 30.00,
                'price_per_pill' => 3.50,
                'cards_count' => 12, // 120 pills total
                'low_stock_threshold' => 20,
            ],
            [
                'category' => 'Antihistamines (Allergy)',
                'brand' => 'Sun Pharma',
                'name' => 'Loratadine 10mg',
                'pin_number' => '90000007',
                'pills_per_card' => 10,
                'price_per_card' => 35.00,
                'price_per_pill' => 4.00,
                'cards_count' => 1, // 10 pills total (Low Stock Alert)
                'low_stock_threshold' => 15,
            ],
            [
                'category' => 'Antipyretics (Fever Reducers)',
                'brand' => 'Novartis',
                'name' => 'Acetaminophen 325mg',
                'pin_number' => '90000008',
                'pills_per_card' => 12,
                'price_per_card' => 24.00,
                'price_per_pill' => 2.50,
                'cards_count' => 16, // 192 pills total
                'low_stock_threshold' => 24,
            ],
            [
                'category' => 'Cardiovascular (Heart/BP)',
                'brand' => 'Pfizer',
                'name' => 'Atorvastatin 20mg',
                'pin_number' => '90000009',
                'pills_per_card' => 14,
                'price_per_card' => 308.00,
                'price_per_pill' => 24.00,
                'cards_count' => 4, // 56 pills total
                'low_stock_threshold' => 14,
            ],
            [
                'category' => 'Cardiovascular (Heart/BP)',
                'brand' => 'AstraZeneca',
                'name' => 'Metoprolol 50mg',
                'pin_number' => '90000010',
                'pills_per_card' => 10,
                'price_per_card' => 148.00,
                'price_per_pill' => 16.00,
                'cards_count' => 0, // 0 pills total (Out of stock)
                'low_stock_threshold' => 10,
            ],
        ];

        foreach ($items as $itemData) {
            $catName = $itemData['category'];
            $brandName = $itemData['brand'];

            $category = $categories[$catName];
            $brand = $brands[$brandName];

            Item::create([
                'category_id' => $category->id,
                'brand_id' => $brand->id,
                'name' => $itemData['name'],
                'pin_number' => $itemData['pin_number'],
                'price' => $itemData['price_per_card'],
                'price_per_card' => $itemData['price_per_card'],
                'price_per_pill' => $itemData['price_per_pill'],
                'pills_per_card' => $itemData['pills_per_card'],
                'quantity' => $itemData['cards_count'] * $itemData['pills_per_card'],
                'low_stock_threshold' => $itemData['low_stock_threshold'],
            ]);
        }
    }
}
