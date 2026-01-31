package com.laundrybuddy.ui.orders;

import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.laundrybuddy.R;
import com.laundrybuddy.databinding.ItemRecentOrderBinding;
import com.laundrybuddy.models.Order;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Adapter for displaying recent orders in horizontal scroll
 */
public class RecentOrderAdapter extends RecyclerView.Adapter<RecentOrderAdapter.RecentOrderViewHolder> {

    private final List<Order> orders;
    private final OnOrderClickListener listener;

    public interface OnOrderClickListener {
        void onOrderClick(Order order);
    }

    public RecentOrderAdapter(List<Order> orders, OnOrderClickListener listener) {
        this.orders = orders;
        this.listener = listener;
    }

    @NonNull
    @Override
    public RecentOrderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemRecentOrderBinding binding = ItemRecentOrderBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new RecentOrderViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull RecentOrderViewHolder holder, int position) {
        holder.bind(orders.get(position));
    }

    @Override
    public int getItemCount() {
        return orders.size();
    }

    class RecentOrderViewHolder extends RecyclerView.ViewHolder {
        private final ItemRecentOrderBinding binding;

        RecentOrderViewHolder(ItemRecentOrderBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        void bind(Order order) {
            // Order number from backend already may have ORD prefix
            String orderNum = order.getOrderNumber();
            if (orderNum != null && !orderNum.startsWith("ORD")) {
                orderNum = "ORD" + orderNum;
            }
            binding.orderNumber.setText(orderNum != null ? orderNum : "Unknown");

            // Status Text
            String status = getStatusDisplay(order.getStatus());
            binding.statusText.setText(status);
            // Optional: Set color if needed, but XML has default blue.
            // We can keep dynamic color if desired.
            binding.statusText.setTextColor(getStatusColor(order.getStatus()));

            binding.orderDate.setText(formatDate(order.getCreatedAt()));

            // Items Summary
            binding.itemsSummary.setText(getItemsSummary(order));

            binding.getRoot().setOnClickListener(v -> {
                if (listener != null) {
                    listener.onOrderClick(order);
                }
            });
        }

        private String getItemsSummary(Order order) {
            if (order.getItems() == null || order.getItems().isEmpty()) {
                int total = order.getTotalItems();
                if (total > 0) {
                    return total + " items";
                }
                return "No items";
            }

            StringBuilder sb = new StringBuilder();
            List<Order.OrderItem> items = order.getItems();
            int limit = Math.min(items.size(), 3);
            int totalCount = 0;

            for (int i = 0; i < limit; i++) {
                Order.OrderItem item = items.get(i);
                // Get quantity (use getQuantity first, fallback to getCount)
                int qty = item.getQuantity();
                if (qty == 0)
                    qty = item.getCount();
                // Get name (use getName first, fallback to getType)
                String name = item.getName();
                if (name == null || name.isEmpty())
                    name = item.getType();
                if (name == null)
                    name = "items";

                totalCount += qty;
                if (sb.length() > 0)
                    sb.append(", ");
                sb.append(qty).append(" ").append(name);
            }

            if (items.size() > limit) {
                sb.append("...");
            }

            if (sb.length() == 0) {
                return order.getTotalItems() + " items";
            }

            return sb.toString();
        }

        private String getStatusDisplay(String status) {
            if (status == null)
                return "Unknown";
            String s = status.toLowerCase();
            switch (s) {
                case "submitted":
                    return "submitted";
                case "pending":
                    return "Submitted (10%)";
                case "received":
                    return "Received (30%)";
                case "washing":
                    return "Washing (50%)";
                case "drying":
                    return "Drying (70%)";
                case "folding":
                    return "Folding (90%)";
                case "ready":
                    return "Ready (100%)";
                case "delivered":
                    return "Delivered";
                default:
                    return status;
            }
        }

        private int getStatusColor(String status) {
            // Return Blue for active, Green for done?
            // Mockup uses Blue for "Submitted".
            return ContextCompat.getColor(binding.getRoot().getContext(), R.color.primary);
        }

        private String formatDate(String dateString) {
            if (dateString == null)
                return "";
            try {
                SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
                Date date = inputFormat.parse(dateString);
                SimpleDateFormat outputFormat = new SimpleDateFormat("dd/MM/yyyy", Locale.getDefault());
                return outputFormat.format(date);
            } catch (ParseException e) {
                return dateString;
            }
        }
    }
}
