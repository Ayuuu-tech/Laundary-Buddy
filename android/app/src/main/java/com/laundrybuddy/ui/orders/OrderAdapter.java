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
            // Order number
            binding.orderNumber.setText("#" + order.getOrderNumber());

            // Items count
            String itemsText = order.getTotalItems() + " items";
            binding.itemsCount.setText(itemsText);

            // Status chip
            binding.statusChip.setText(order.getStatusDisplay());
            binding.statusChip.setChipBackgroundColor(ColorStateList.valueOf(
                    getStatusColor(order.getStatus())));
            binding.statusChip.setTextColor(ContextCompat.getColor(
                    binding.getRoot().getContext(), R.color.text_on_primary));

            // Date
            binding.orderDate.setText(formatDate(order.getCreatedAt()));

            // Rating display logic
            if (order.isDelivered()) {
                if (order.isRated()) {
                    // Show rating value
                    binding.ratingDisplay.setVisibility(View.VISIBLE);
                    binding.ratingValue.setText(String.valueOf(order.getRating()));
                    binding.rateButton.setVisibility(View.GONE);
                } else {
                    // Show rate button
                    binding.ratingDisplay.setVisibility(View.GONE);
                    binding.rateButton.setVisibility(View.VISIBLE);
                    binding.rateButton.setOnClickListener(v -> {
                        if (rateListener != null) {
                            rateListener.onRateClick(order);
                        }
                    });
                }
            } else {
                // Hide rating UI for non-delivered orders
                binding.ratingDisplay.setVisibility(View.GONE);
                binding.rateButton.setVisibility(View.GONE);
            }

            // Click listener
            binding.getRoot().setOnClickListener(v -> {
                if (clickListener != null) {
                    clickListener.onOrderClick(order);
                }
            });
        }

        private int getStatusColor(String status) {
            if (status == null)
                return ContextCompat.getColor(binding.getRoot().getContext(), R.color.text_hint);

            switch (status.toLowerCase()) {
                case "pending":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_pending);
                case "received":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_received);
                case "washing":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_washing);
                case "drying":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_drying);
                case "folding":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_folding);
                case "ready":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_ready);
                case "delivered":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_delivered);
                case "cancelled":
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_cancelled);
                default:
                    return ContextCompat.getColor(binding.getRoot().getContext(), R.color.text_hint);
            }
        }

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
