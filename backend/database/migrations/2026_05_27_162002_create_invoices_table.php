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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique()->index();
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->string('customer_name')->nullable();
            $table->decimal('total_amount', 10, 2);
            $table->decimal('discount', 10, 2)->default(0.00);
            $table->decimal('tax', 10, 2)->default(0.00);
            $table->decimal('net_amount', 10, 2);
            $table->decimal('amount_paid', 10, 2)->default(0.00);
            $table->decimal('change_amount', 10, 2)->default(0.00);
            $table->string('payment_method')->default('Cash'); // Cash, Card
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
