<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->onDelete('restrict');
            $table->foreignId('brand_id')->nullable()->constrained('brands')->onDelete('restrict');
            $table->string('name')->index();
            $table->string('pin_number')->unique()->index(); // Scannable barcode/SKU
            $table->decimal('price', 10, 2);
            $table->decimal('price_per_card', 10, 2)->default(0.00);
            $table->decimal('price_per_pill', 10, 2)->default(0.00);
            $table->unsignedInteger('pills_per_card')->default(1);
            $table->unsignedInteger('quantity')->default(0); // Total count in individual pills
            $table->unsignedInteger('low_stock_threshold')->default(10);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
