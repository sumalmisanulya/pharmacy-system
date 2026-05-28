<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'invoice_number',
        'user_id',
        'customer_name',
        'total_amount',
        'discount',
        'tax',
        'net_amount',
        'amount_paid',
        'change_amount',
        'payment_method',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'amount_paid' => 'decimal:2',
        'change_amount' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    /**
     * Boot function to auto-generate unique invoice numbers.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($invoice) {
            if (empty($invoice->invoice_number)) {
                $date = now()->format('Ymd');
                $random = strtoupper(bin2hex(random_bytes(2))); // 4 character random hash
                $invoice->invoice_number = "INV-{$date}-{$random}";
            }
        });
    }
}
