package com.laundrybuddy.ui.staff;

import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.laundrybuddy.R;
import com.laundrybuddy.databinding.ItemStaffOrderBinding;
import com.laundrybuddy.models.Order;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * RecyclerView Adapter for Staff Order management with selection support
 */
public class StaffOrderAdapter extends RecyclerView.Adapter<StaffOrderAdapter.OrderViewHolder> {

    private final List<Order> orders;
    private final OnOrderClickListener clickListener;
    private final OnOrderLongClickListener longClickListener;
    private final OnPriorityToggleListener priorityListener;
    private final Set<String> selectedOrderIds = new HashSet<>();
    private boolean selectionMode = false;

    public interface OnOrderClickListener {
        void onOrderClick(Order order);
    }

    public interface OnOrderLongClickListener {
        void onOrderLongClick(Order order);
    }

    public interface OnPriorityToggleListener {
        void onPriorityToggle(Order order, boolean isPriority);
    }

    public StaffOrderAdapter(List<Order> orders, OnOrderClickListener clickListener,
            OnOrderLongClickListener longClickListener) {
        this(orders, clickListener, longClickListener, null);
    }

    public StaffOrderAdapter(List<Order> orders, OnOrderClickListener clickListener,
            OnOrderLongClickListener longClickListener, OnPriorityToggleListener priorityListener) {
        this.orders = orders;
        this.clickListener = clickListener;
        this.longClickListener = longClickListener;
        this.priorityListener = priorityListener;
    }

    @NonNull
    @Override
    public OrderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemStaffOrderBinding binding = ItemStaffOrderBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new OrderViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull OrderViewHolder holder, int position) {
        Order order = orders.get(position);
        boolean isSelected = selectedOrderIds.contains(order.getId());
        holder.bind(order, isSelected, selectionMode, clickListener, longClickListener, priorityListener, this);
    }

    @Override
    public int getItemCount() {
        return orders.size();
    }

    public void setSelectionMode(boolean enabled) {
        this.selectionMode = enabled;
        if (!enabled) {
            selectedOrderIds.clear();
        }
        notifyDataSetChanged();
    }

    public boolean isSelectionMode() {
        return selectionMode;
    }

    public void toggleSelection(Order order) {
        String id = order.getId();
        if (selectedOrderIds.contains(id)) {
            selectedOrderIds.remove(id);
        } else {
            selectedOrderIds.add(id);
        }
        notifyDataSetChanged();
    }

    public Set<String> getSelectedOrderIds() {
        return new HashSet<>(selectedOrderIds);
    }

    public List<Order> getSelectedOrders() {
        List<Order> selected = new ArrayList<>();
        for (Order order : orders) {
            if (selectedOrderIds.contains(order.getId())) {
                selected.add(order);
            }
        }
        return selected;
    }

    public int getSelectedCount() {
        return selectedOrderIds.size();
    }

    public void clearSelection() {
        selectedOrderIds.clear();
        notifyDataSetChanged();
    }

    static class OrderViewHolder extends RecyclerView.ViewHolder {
        private final ItemStaffOrderBinding binding;

        OrderViewHolder(ItemStaffOrderBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        void bind(Order order, boolean isSelected, boolean selectionMode,
                OnOrderClickListener clickListener, OnOrderLongClickListener longClickListener,
                OnPriorityToggleListener priorityListener, StaffOrderAdapter adapter) {
            // Order number
            binding.orderNumber.setText("#" + order.getOrderNumber());

            // User info
            String userInfo = order.getUserName();
            if (order.getHostelRoom() != null && !order.getHostelRoom().isEmpty()) {
                userInfo += " • " + order.getHostelRoom();
            }
            binding.userInfo.setText(userInfo);

            // Items count
            binding.itemsCount.setText(order.getTotalItems() + " items");

            // Status chip
            binding.statusChip.setText(order.getStatusDisplay());
            binding.statusChip.setChipBackgroundColor(ColorStateList.valueOf(
                    getStatusColor(order.getStatus())));
            binding.statusChip.setTextColor(ContextCompat.getColor(
                    binding.getRoot().getContext(), R.color.text_on_primary));

            // Date
            binding.orderDate.setText(formatDate(order.getCreatedAt()));

            // Priority icon
            boolean isPriority = order.isPriority();
            binding.priorityIcon.setImageResource(isPriority
                    ? android.R.drawable.star_big_on
                    : android.R.drawable.star_big_off);
            binding.priorityIcon.setColorFilter(isPriority
                    ? ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_pending)
                    : ContextCompat.getColor(binding.getRoot().getContext(), R.color.text_hint));

            binding.priorityIcon.setOnClickListener(v -> {
                boolean newPriority = !order.isPriority();
                order.setIsPriority(newPriority);
                binding.priorityIcon.setImageResource(newPriority
                        ? android.R.drawable.star_big_on
                        : android.R.drawable.star_big_off);
                binding.priorityIcon.setColorFilter(newPriority
                        ? ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_pending)
                        : ContextCompat.getColor(binding.getRoot().getContext(), R.color.text_hint));
                if (priorityListener != null) {
                    priorityListener.onPriorityToggle(order, newPriority);
                }
            });

            // Selection checkbox visibility
            binding.selectionCheckbox.setVisibility(selectionMode ? View.VISIBLE : View.GONE);
            binding.selectionCheckbox.setChecked(isSelected);

            // Card highlight when selected
            if (isSelected) {
                binding.getRoot().setStrokeColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.primary));
                binding.getRoot().setStrokeWidth(4);
            } else {
                binding.getRoot().setStrokeWidth(0);
            }

            // Click handlers
            binding.getRoot().setOnClickListener(v -> {
                if (selectionMode) {
                    adapter.toggleSelection(order);
                } else if (clickListener != null) {
                    clickListener.onOrderClick(order);
                }
            });

            binding.getRoot().setOnLongClickListener(v -> {
                if (!selectionMode && longClickListener != null) {
                    longClickListener.onOrderLongClick(order);
                }
                return true;
            });

            binding.selectionCheckbox.setOnClickListener(v -> {
                adapter.toggleSelection(order);
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
                SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, HH:mm", Locale.US);
                Date date = isoFormat.parse(isoDate);
                return date != null ? displayFormat.format(date) : isoDate;
            } catch (ParseException e) {
                return isoDate;
            }
        }
    }
}
