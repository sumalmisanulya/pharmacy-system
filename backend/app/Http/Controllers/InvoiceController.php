<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class InvoiceController extends Controller
{
    /**
     * Display a listing of invoices.
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['user', 'items.item.category', 'items.item.brand']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', '%' . $search . '%')
                  ->orWhere('customer_name', 'like', '%' . $search . '%');
            });
        }

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        $invoices = $query->orderBy('created_at', 'desc')
                          ->paginate($request->integer('per_page', 20));

        return response()->json($invoices);
    }

    /**
     * Store a newly created invoice (Checkout).
     */
    public function store(Request $request)
    {
        $request->validate([
            'customer_name' => 'nullable|string|max:255',
            'discount' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'payment_method' => 'required|string|in:Cash,Card',
            'amount_paid' => 'required|numeric|min:0',
            'change_amount' => 'required|numeric',
            'items' => 'required|array|min:1',
            'items.*.item_id' => 'required|exists:items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit' => 'required|string|in:card,pill',
        ]);

        try {
            $invoice = DB::transaction(function () use ($request) {
                $cartItems = $request->items;
                $itemIds = collect($cartItems)->pluck('item_id')->toArray();

                // 1. Fetch items with pessimistic locking (lockForUpdate)
                $dbItems = Item::whereIn('id', $itemIds)->lockForUpdate()->get()->keyBy('id');

                $totalAmount = 0;
                $invoiceLines = [];

                // 2. Validate quantities and calculate pricing
                foreach ($cartItems as $cartItem) {
                    $id = $cartItem['item_id'];
                    $qty = $cartItem['quantity'];
                    $unit = $cartItem['unit'];

                    if (!isset($dbItems[$id])) {
                        throw ValidationException::withMessages([
                            'items' => ["Item ID {$id} not found in database."]
                        ]);
                    }

                    $dbItem = $dbItems[$id];
                    
                    // Convert chosen unit to individual pills quantity
                    $pillsNeeded = $unit === 'card' ? ($qty * $dbItem->pills_per_card) : $qty;

                    if ($dbItem->quantity < $pillsNeeded) {
                        $availableText = $dbItem->pills_per_card > 1 
                            ? floor($dbItem->quantity / $dbItem->pills_per_card) . " cards, " . ($dbItem->quantity % $dbItem->pills_per_card) . " pills"
                            : $dbItem->quantity . " units";
                        throw ValidationException::withMessages([
                            'items' => ["Insufficient stock for {$dbItem->name}. Available: {$availableText}. Requested: {$qty} {$unit}(s)."]
                        ]);
                    }

                    $price = $unit === 'card' ? $dbItem->price_per_card : $dbItem->price_per_pill;
                    $subtotal = $price * $qty;
                    $totalAmount += $subtotal;

                    // Deduct stock in individual pills
                    $dbItem->quantity -= $pillsNeeded;
                    $dbItem->save();

                    $invoiceLines[] = [
                        'item_id' => $id,
                        'quantity' => $qty,
                        'unit' => $unit,
                        'price' => $price,
                        'subtotal' => $subtotal,
                    ];
                }

                $discount = $request->input('discount', 0);
                $tax = $request->input('tax', 0);
                $netAmount = ($totalAmount - $discount) + $tax;
                if ($netAmount < 0) {
                    $netAmount = 0;
                }

                // 3. Create the Invoice header
                $invoice = Invoice::create([
                    'user_id' => $request->user()->id,
                    'customer_name' => $request->customer_name,
                    'total_amount' => $totalAmount,
                    'discount' => $discount,
                    'tax' => $tax,
                    'net_amount' => $netAmount,
                    'amount_paid' => $request->amount_paid,
                    'change_amount' => $request->change_amount,
                    'payment_method' => $request->payment_method,
                ]);

                // 4. Create invoice items
                foreach ($invoiceLines as $line) {
                    $invoice->items()->create($line);
                }

                return $invoice;
            });

            // Return full invoice details for frontend rendering/printing
            return response()->json([
                'message' => 'Invoice issued successfully.',
                'invoice' => $invoice->load(['user', 'items.item.category', 'items.item.brand'])
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Checkout transaction failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified invoice.
     */
    public function show(Invoice $invoice)
    {
        return response()->json($invoice->load(['user', 'items.item.category', 'items.item.brand']));
    }
}
