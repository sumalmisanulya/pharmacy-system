<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;

class Item extends Model
{
    protected $fillable = [
        'category_id',
        'brand_id',
        'name',
        'pin_number',
        'price',
        'price_per_card',
        'price_per_pill',
        'pills_per_card',
        'quantity',
        'low_stock_threshold',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'price_per_card' => 'decimal:2',
        'price_per_pill' => 'decimal:2',
        'pills_per_card' => 'integer',
        'quantity' => 'integer',
        'low_stock_threshold' => 'integer',
    ];

    /**
     * Boot logic to automatically sync the legacy price column to price_per_card
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($item) {
            // Keep legacy price column in sync with price_per_card
            if (empty($item->price) || $item->price == 0) {
                $item->price = $item->price_per_card;
            }
        });
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    /**
     * Scope to find low stock items.
     */
    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('quantity', '<=', 'low_stock_threshold');
    }

    /**
     * Scope to search by name, barcode pin_number, or brand name.
     */
    public function scopeSearch(Builder $query, string $search): Builder
    {
        return $query->where(function ($q) use ($search) {
            $q->where('name', 'like', '%' . $search . '%')
              ->orWhere('pin_number', 'like', '%' . $search . '%')
              ->orWhereHas('brand', function ($qb) use ($search) {
                  $qb->where('name', 'like', '%' . $search . '%');
              });
        });
    }
}
