package com.laundrybuddy.ui.support;

import android.content.res.ColorStateList;
import android.view.LayoutInflater;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.laundrybuddy.R;
import com.laundrybuddy.databinding.ItemTicketBinding;
import com.laundrybuddy.models.SupportTicket;

import java.util.List;

/**
 * RecyclerView Adapter for Support Tickets
 */
public class TicketAdapter extends RecyclerView.Adapter<TicketAdapter.TicketViewHolder> {

    private final List<SupportTicket> tickets;
    private final OnTicketClickListener listener;

    public interface OnTicketClickListener {
        void onTicketClick(SupportTicket ticket);
    }

    public TicketAdapter(List<SupportTicket> tickets, OnTicketClickListener listener) {
        this.tickets = tickets;
        this.listener = listener;
    }

    @NonNull
    @Override
    public TicketViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemTicketBinding binding = ItemTicketBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new TicketViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull TicketViewHolder holder, int position) {
        SupportTicket ticket = tickets.get(position);
        holder.bind(ticket, listener);
    }

    @Override
    public int getItemCount() {
        return tickets.size();
    }

    static class TicketViewHolder extends RecyclerView.ViewHolder {
        private final ItemTicketBinding binding;

        TicketViewHolder(ItemTicketBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        void bind(SupportTicket ticket, OnTicketClickListener listener) {
            String category = ticket.getCategory();
            binding.categoryText.setText(category != null && !category.isEmpty() ? category : "Support Ticket");

            String status = ticket.getStatus();
            binding.statusText.setText(status != null ? status : "pending");

            String orderNum = ticket.getOrderNumber();
            String date = ticket.getCreatedAt();
            // Simple date formatting
            if (date != null && date.length() >= 10) {
                date = date.substring(0, 10);
            }
            String info = "Order #" + (orderNum != null ? orderNum : "N/A");
            if (date != null)
                info += " - " + date;

            binding.orderInfoText.setText(info);

            binding.itemDescription.setText(ticket.getSubject());
            binding.issueDescription.setText(ticket.getDescription());

            // Apply dynamic status color
            int statusColor = getStatusColor(status);
            binding.statusText.setTextColor(statusColor);

            // Update card stroke color based on status
            if (binding.getRoot() instanceof com.google.android.material.card.MaterialCardView) {
                ((com.google.android.material.card.MaterialCardView) binding.getRoot())
                        .setStrokeColor(statusColor);
            }

            binding.getRoot().setOnClickListener(v -> {
                if (listener != null) {
                    listener.onTicketClick(ticket);
                }
            });
        }

        private int getStatusColor(String status) {
            if (status == null)
                return 0xFF757575; // Grey
            switch (status.toLowerCase()) {
                case "open":
                case "pending":
                case "new":
                    return 0xFFE67E22; // Orange
                case "in progress":
                case "in-progress":
                case "processing":
                    return 0xFF2196F3; // Blue
                case "resolved":
                case "closed":
                case "completed":
                    return 0xFF27AE60; // Green
                case "rejected":
                case "cancelled":
                    return 0xFFE74C3C; // Red
                default:
                    return 0xFFE67E22; // Orange default
            }
        }
    }
}
