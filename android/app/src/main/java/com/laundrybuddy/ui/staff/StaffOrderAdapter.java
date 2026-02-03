package com.laundrybuddy.ui.staff;

import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.PopupMenu;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.laundrybuddy.R;
import com.laundrybuddy.databinding.ItemStaffOrderBinding;
import com.laundrybuddy.models.Order;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
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
    private final OnQuickActionListener quickActionListener;
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

    public interface OnQuickActionListener {
        void onMarkComplete(Order order);
        void onStatusChange(Order order, String newStatus);
    }

    public StaffOrderAdapter(List<Order> orders, OnOrderClickListener clickListener,
            OnOrderLongClickListener longClickListener) {
        this(orders, clickListener, longClickListener, null, null);
    }

    public StaffOrderAdapter(List<Order> orders, OnOrderClickListener clickListener,
            OnOrderLongClickListener longClickListener, OnPriorityToggleListener priorityListener) {
        this(orders, clickListener, longClickListener, priorityListener, null);
    }

    public StaffOrderAdapter(List<Order> orders, OnOrderClickListener clickListener,
            OnOrderLongClickListener longClickListener, OnPriorityToggleListener priorityListener,
            OnQuickActionListener quickActionListener) {
        this.orders = orders;
        this.clickListener = clickListener;
        this.longClickListener = longClickListener;
        this.priorityListener = priorityListener;
        this.quickActionListener = quickActionListener;
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
        holder.bind(order, isSelected, selectionMode, clickListener, longClickListener, 
                priorityListener, quickActionListener, this);
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
                OnPriorityToggleListener priorityListener, OnQuickActionListener quickActionListener,
                StaffOrderAdapter adapter) {

            // Order number
            binding.orderNumber.setText("#" + order.getOrderNumber());

            // Room info
            String roomInfo = order.getHostelRoom();
            if (roomInfo == null || roomInfo.isEmpty()) {
                roomInfo = "No room specified";
            }
            binding.roomInfo.setText(roomInfo);

            // User name
            String userName = order.getUserName();
            if (userName == null || userName.isEmpty()) {
                userName = "Unknown User";
            }
            binding.userName.setText(userName);

            // Items count
            binding.itemsCount.setText(order.getTotalItems() + " items");

            // Status chip
            binding.statusChip.setText(order.getStatusDisplay());
            binding.statusChip.setChipBackgroundColor(ColorStateList.valueOf(
                    getStatusColor(order.getStatus())));
            binding.statusChip.setTextColor(ContextCompat.getColor(
                    binding.getRoot().getContext(), R.color.text_on_primary));

            // Submitted date
            binding.submittedDate.setText(formatDateTime(order.getCreatedAt()));

            // ETA - calculate as 24-48 hours from creation based on status
            binding.etaDate.setText(calculateEta(order));

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

            // Mark complete button - hide if already completed/delivered
            String status = order.getStatus();
            boolean isCompleted = "delivered".equalsIgnoreCase(status) || "completed".equalsIgnoreCase(status);
            binding.markCompleteBtn.setVisibility(isCompleted ? View.GONE : View.VISIBLE);

            binding.markCompleteBtn.setOnClickListener(v -> {
                if (quickActionListener != null) {
                    quickActionListener.onMarkComplete(order);
                }
            });

            // More options button
            binding.moreOptionsBtn.setOnClickListener(v -> {
                showPopupMenu(v, order, quickActionListener);
            });

            // Click handlers
            binding.getRoot().setOnClickListener(v -> {
                if (selectionMode) {
                    adapter.toggleSelection(order);
                } else if (clickListener != null) {
                    clickListener.onOrderClick(order);
                }
            });

            binding.getRoot().setOnLongClickListener(v -> {
                if (longClickListener != null) {
                    longClickListener.onOrderLongClick(order);
                    return true;
                }
                return false;
            });

            binding.selectionCheckbox.setOnClickListener(v -> {
                adapter.toggleSelection(order);
            });
        }

        private void showPopupMenu(View anchor, Order order, OnQuickActionListener listener) {
            PopupMenu popup = new PopupMenu(anchor.getContext(), anchor);
            popup.getMenuInflater().inflate(R.menu.menu_order_actions, popup.getMenu());

            popup.setOnMenuItemClickListener(item -> {
                if (listener == null) return false;

                int id = item.getItemId();
                if (id == R.id.action_pending) {
                    listener.onStatusChange(order, "pending");
                } else if (id == R.id.action_received) {
                    listener.onStatusChange(order, "received");
                } else if (id == R.id.action_washing) {
                    listener.onStatusChange(order, "washing");
                } else if (id == R.id.action_drying) {
                    listener.onStatusChange(order, "drying");
                } else if (id == R.id.action_folding) {
                    listener.onStatusChange(order, "folding");
                } else if (id == R.id.action_ready) {
                    listener.onStatusChange(order, "ready");
                } else if (id == R.id.action_delivered) {
                    listener.onStatusChange(order, "delivered");
                }
                return true;
            });

            popup.show();
        }

        private String calculateEta(Order order) {
            String createdAt = order.getCreatedAt();
            if (createdAt == null) return "N/A";

            try {
                SimpleDateFormat[] formats = {
                    new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()),
                    new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()),
                    new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                };

                Date date = null;
                for (SimpleDateFormat fmt : formats) {
                    try {
                        date = fmt.parse(createdAt);
                        if (date != null) break;
                    } catch (ParseException ignored) {}
                }

                if (date == null) return "N/A";

                // Add 24-48 hours based on status
                Calendar cal = Calendar.getInstance();
                cal.setTime(date);

                String status = order.getStatus();
                if ("pending".equalsIgnoreCase(status) || "received".equalsIgnoreCase(status)) {
                    cal.add(Calendar.HOUR, 48);
                } else if ("washing".equalsIgnoreCase(status) || "drying".equalsIgnoreCase(status)) {
                    cal.add(Calendar.HOUR, 24);
                } else if ("folding".equalsIgnoreCase(status)) {
                    cal.add(Calendar.HOUR, 12);
                } else if ("ready".equalsIgnoreCase(status)) {
                    cal.add(Calendar.HOUR, 6);
                } else {
                    return "Completed";
                }

                SimpleDateFormat outFmt = new SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault());
                return outFmt.format(cal.getTime());

            } catch (Exception e) {
                return "N/A";
            }
        }

        private String formatDateTime(String dateStr) {
            if (dateStr == null) return "N/A";

            try {
                SimpleDateFormat[] formats = {
                    new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()),
                    new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.getDefault()),
                    new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                };

                Date date = null;
                for (SimpleDateFormat fmt : formats) {
                    try {
                        date = fmt.parse(dateStr);
                        if (date != null) break;
                    } catch (ParseException ignored) {}
                }

                if (date != null) {
                    SimpleDateFormat outFmt = new SimpleDateFormat("MMM dd, HH:mm", Locale.getDefault());
                    return outFmt.format(date);
                }
            } catch (Exception e) {
                // Fall through
            }
            return dateStr.length() > 10 ? dateStr.substring(0, 10) : dateStr;
        }

        private int getStatusColor(String status) {
            if (status == null) return 0xFF757575;

            switch (status.toLowerCase()) {
                case "pending":
                case "submitted":
                    return 0xFFE67E22; // Orange
                case "received":
                case "washing":
                case "drying":
                case "folding":
                    return 0xFF3498DB; // Blue
                case "ready":
                    return 0xFF9B59B6; // Purple
                case "delivered":
                case "completed":
                    return 0xFF27AE60; // Green
                case "cancelled":
                    return 0xFFE74C3C; // Red
                default:
                    return 0xFF757575; // Grey
            }
        }
    }
}
