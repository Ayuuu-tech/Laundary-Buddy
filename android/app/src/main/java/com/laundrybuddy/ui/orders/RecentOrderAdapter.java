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
            binding.orderNumber.setText("#" + order.getOrderNumber());
            binding.statusChip.setText(getStatusDisplay(order.getStatus()));
            binding.statusChip.setChipBackgroundColor(ColorStateList.valueOf(getStatusColor(order.getStatus())));
            binding.statusChip
                    .setTextColor(ContextCompat.getColor(binding.getRoot().getContext(), R.color.text_on_primary));
            binding.orderDate.setText(formatDate(order.getCreatedAt()));

            binding.getRoot().setOnClickListener(v -> {
                if (listener != null) {
                    listener.onOrderClick(order);
                }
            });
        }

        private String getStatusDisplay(String status) {
            if (status == null)
                return "Unknown";
            switch (status.toLowerCase()) {
                case "pending":
                    return "Pending";
                case "received":
                    return "Received";
                case "washing":
                    return "Washing";
                case "drying":
                    return "Drying";
                case "folding":
                    return "Folding";
                case "ready":
                    return "Ready";
                case "delivered":
                    return "Delivered";
                case "cancelled":
                    return "Cancelled";
                default:
                    return status;
            }
        }

        private int getStatusColor(String status) {
            if (status == null)
                return ContextCompat.getColor(binding.getRoot().getContext(), R.color.text_hint);
            switch (status.toLowerCase()) {
                case "pending":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_pending);
                case "received":
                case "washing":
                case "drying":
                case "folding":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_washing);
                case "ready":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_ready);
                case "delivered":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.success);
                case "cancelled":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.error);
                default:
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.text_hint);
            }
        }

        private String formatDate(String dateString) {
            if (dateString == null)
                return "";
            try {
                SimpleDateFormat inputFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault());
                Date date = inputFormat.parse(dateString);
                SimpleDateFormat outputFormat = new SimpleDateFormat("MMM dd", Locale.getDefault());
                return outputFormat.format(date);
            } catch (ParseException e) {
                return dateString.substring(0, Math.min(10, dateString.length()));
            }
        }
    }
}
