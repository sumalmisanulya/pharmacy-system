<?php

namespace App\Http\Controllers;

use App\Models\Item;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ItemController extends Controller
{
    /**
     * Display a listing of items (with search, category filter, stock filters).
     */
    public function index(Request $request)
    {
        $query = Item::with(['category', 'brand']);

        // Apply search if present
        if ($request->filled('search')) {
            $query->search($request->search);
        }

        // Apply category filter if present
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Apply low stock filter if present
        if ($request->boolean('low_stock')) {
            $query->lowStock();
        }

        // Sort items: out of stock and low stock first, then by name
        $items = $query->orderByRaw('quantity = 0 DESC')
                       ->orderByRaw('quantity <= low_stock_threshold DESC')
                       ->orderBy('name', 'asc')
                       ->paginate($request->integer('per_page', 50));

        return response()->json($items);
    }

    /**
     * Get only low stock items.
     */
    public function lowStock(Request $request)
    {
        $items = Item::with(['category', 'brand'])
            ->lowStock()
            ->orderBy('quantity', 'asc')
            ->get();

        return response()->json($items);
    }

    /**
     * Store a newly created item in database (Super Admin only).
     */
    public function store(Request $request)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized. Super Admin role required.'], 403);
        }

        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'brand_name' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'pin_number' => 'required|string|unique:items,pin_number|max:50',
            'price_per_card' => 'required|numeric|min:0',
            'price_per_pill' => 'required|numeric|min:0',
            'pills_per_card' => 'required|integer|min:1',
            'quantity' => 'required|integer|min:0',
            'low_stock_threshold' => 'required|integer|min:0',
        ]);

        if ($request->filled('brand_name')) {
            $brand = Brand::firstOrCreate(['name' => trim($request->brand_name)]);
            $validated['brand_id'] = $brand->id;
        }

        // Default legacy price for safety
        $validated['price'] = $validated['price_per_card'];

        $item = Item::create($validated);

        return response()->json([
            'message' => 'Item created successfully.',
            'item' => $item->load(['category', 'brand'])
        ], 201);
    }

    /**
     * Display the specified item.
     */
    public function show(Item $item)
    {
        return response()->json($item->load(['category', 'brand']));
    }

    /**
     * Update the specified item (Super Admin only).
     */
    public function update(Request $request, Item $item)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized. Super Admin role required.'], 403);
        }

        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'brand_name' => 'nullable|string|max:255',
            'name' => 'required|string|max:255',
            'pin_number' => ['required', 'string', 'max:50', Rule::unique('items')->ignore($item->id)],
            'price_per_card' => 'required|numeric|min:0',
            'price_per_pill' => 'required|numeric|min:0',
            'pills_per_card' => 'required|integer|min:1',
            'quantity' => 'required|integer|min:0',
            'low_stock_threshold' => 'required|integer|min:0',
        ]);

        if ($request->filled('brand_name')) {
            $brand = Brand::firstOrCreate(['name' => trim($request->brand_name)]);
            $validated['brand_id'] = $brand->id;
        } else {
            $validated['brand_id'] = null;
        }

        // Default legacy price for safety
        $validated['price'] = $validated['price_per_card'];

        $item->update($validated);

        return response()->json([
            'message' => 'Item updated successfully.',
            'item' => $item->load(['category', 'brand'])
        ]);
    }

    /**
     * Remove the specified item (Super Admin only).
     */
    public function destroy(Request $request, Item $item)
    {
        if ($request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Unauthorized. Super Admin role required.'], 403);
        }

        try {
            $item->delete();
            return response()->json([
                'message' => 'Item deleted successfully.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Cannot delete item. It may be referenced in invoice history.'
            ], 409);
        }
    }
}
