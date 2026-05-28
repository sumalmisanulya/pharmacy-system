<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get aggregate statistics for dashboard metrics.
     */
    public function stats(Request $request)
    {
        $today = Carbon::today();

        $totalItemsCount = Item::count();
        $outOfStockCount = Item::where('quantity', 0)->count();
        $lowStockCount = Item::lowStock()->count();

        // Calculate total inventory value in terms of cards and loose pills
        $items = Item::all();
        $inventoryValue = 0;
        foreach ($items as $item) {
            if ($item->pills_per_card > 0) {
                $cards = floor($item->quantity / $item->pills_per_card);
                $pills = $item->quantity % $item->pills_per_card;
                $inventoryValue += ($cards * $item->price_per_card) + ($pills * $item->price_per_pill);
            } else {
                $inventoryValue += $item->quantity * $item->price;
            }
        }

        // Sales statistics
        $salesToday = Invoice::whereDate('created_at', $today)->sum('net_amount');
        $invoicesTodayCount = Invoice::whereDate('created_at', $today)->count();

        // Daily Sales breakdown by admin/cashier
        $salesByAdmin = DB::table('invoices')
            ->join('users', 'invoices.user_id', '=', 'users.id')
            ->whereDate('invoices.created_at', $today)
            ->select('users.name as admin_name', DB::raw('SUM(invoices.net_amount) as total_sales'), DB::raw('COUNT(invoices.id) as sales_count'))
            ->groupBy('users.id', 'users.name')
            ->get();

        // Recent transactions
        $recentInvoices = Invoice::with(['user', 'items.item'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        return response()->json([
            'total_items' => $totalItemsCount,
            'out_of_stock' => $outOfStockCount,
            'low_stock' => $lowStockCount,
            'inventory_value' => round((float) $inventoryValue, 2),
            'sales_today' => round((float) $salesToday, 2),
            'invoices_today' => $invoicesTodayCount,
            'sales_by_admin' => $salesByAdmin,
            'recent_invoices' => $recentInvoices,
        ]);
    }
}
