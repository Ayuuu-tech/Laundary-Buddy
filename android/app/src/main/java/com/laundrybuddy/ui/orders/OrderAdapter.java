package com.laundrybuddy.ui.orders;

import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.laundrybuddy.R;
import com.laundrybuddy.databinding.ItemOrderBinding;
import com.laundrybuddy.models.Order;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * RecyclerView Adapter for Order items with rating support
 */
public class OrderAdapter extends RecyclerView.Adapter<OrderAdapter.OrderViewHolder> {

    private final List<Order> orders;
    private final OnOrderClickListener clickListener;
    private OnRateClickListener rateListener;

    public interface OnOrderClickListener {
        void onOrderClick(Order order);
    }

    public interface OnRateClickListener {
        void onRateClick(Order order);
    }

    public OrderAdapter(List<Order> orders, OnOrderClickListener listener) {
        this.orders = orders;
        this.clickListener = listener;
    }

    public void setRateClickListener(OnRateClickListener listener) {
        this.rateListener = listener;
    }

    @NonNull
    @Override
    public OrderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemOrderBinding binding = ItemOrderBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new OrderViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull OrderViewHolder holder, int position) {
        Order order = orders.get(position);
        holder.bind(order, clickListener, rateListener);
    }

    @Override
    public int getItemCount() {
        return orders.size();
    }

    static class OrderViewHolder extends RecyclerView.ViewHolder {
        private final ItemOrderBinding binding;

        OrderViewHolder(ItemOrderBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        void bind(Order order, OnOrderClickListener clickListener, OnRateClickListener rateListener) {
            // Order Number
            String orderNum = order.getOrderNumber();
            if (orderNum == null || orderNum.isEmpty()) {
                orderNum = "ORD" + order.getId().substring(0, 8).toUpperCase();
            }
            binding.orderNumber.setText(orderNum);

            // Date
            binding.orderDate.setText(formatDate(order.getCreatedAt()));

            // Items Summary
            if (order.getItems() != null && !order.getItems().isEmpty()) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < order.getItems().size(); i++) {
                    Order.OrderItem item = order.getItems().get(i);
                    if (i > 0)
                        sb.append(", ");
                    int qty = item.getQuantity() > 0 ? item.getQuantity() : item.getCount();
                    String name = item.getName();
                    if (name == null || "null".equals(name) || name.isEmpty()) {
                        name = item.getType();
                        if (name == null || name.isEmpty()) {
                            name = item.getCategory();
                        }
                        if (name == null || name.isEmpty()) {
                            name = "Clothes";
                        }
                    }
                    sb.append(qty).append(" ").append(name);
                }
                binding.itemsSummary.setText(sb.toString());
            } else {
                binding.itemsSummary.setText(order.getTotalItems() + " items");
            }

            // Status
            String status = order.getStatusDisplay();
            binding.statusText.setText(status);

            // Set Colors
            int color = getStatusColor(order.getStatus());
            binding.statusText.setTextColor(color);
            binding.accentBar.setBackgroundColor(color);

            // Rating / Feedback Logic
            binding.rateButton.setVisibility(View.GONE);
            binding.ratingDisplay.setVisibility(View.GONE);

            // If order is completed/delivered or received (logic depends on business rules,
            // usually 'delivered')
            if (order.isDelivered() || "completed".equalsIgnoreCase(order.getStatus())) {
                if (order.isRated()) {
                    // Already rated, show rating
                    binding.ratingDisplay.setVisibility(View.VISIBLE);
                    binding.ratingDisplay.setText("★ " + order.getRating());
                } else {
                    // Not rated, show option to rate
                    binding.rateButton.setVisibility(View.VISIBLE);
                    binding.rateButton.setOnClickListener(v -> {
                        if (rateListener != null) {
                            rateListener.onRateClick(order);
                        }
                    });
                }
            }

            // Click listener for whole card
            binding.getRoot().setOnClickListener(v -> {
                if (clickListener != null) {
                    clickListener.onOrderClick(order);
                }
            });
        }

        private int getStatusColor(String status) {
            if (status == null)
                return 0xFF757575;
            switch (status.toLowerCase()) {
                case "pending":
                case "submitted":
                    return 0xFF2196F3; // Blue
                case "received":
                case "washing":
                case "drying":
                case "folding":
                    return 0xFFE67E22; // Orange
                case "ready":
                case "ready for pickup":
                case "ready-for-pickup":
                    return 0xFFF39C12; // Orange/Yellow
                case "delivered":
                case "completed":
                    return 0xFF27AE60; // Green
                case "cancelled":
                    return 0xFFE74C3C; // Red
                default:
                    return 0xFF2196F3;
            }
        }

        // Removed getStatusBgColor as it is no longer used

        private String formatDate(String isoDate) {
            if (isoDate == null)
                return "";
            try {
                SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy", Locale.US);
                Date date = isoFormat.parse(isoDate);
                return date != null ? displayFormat.format(date) : isoDate;
            } catch (ParseException e) {
                return isoDate;
            }
        }
    }
}
