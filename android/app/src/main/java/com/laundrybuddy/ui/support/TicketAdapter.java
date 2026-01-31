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
            binding.subject.setText(ticket.getSubject());
            binding.description.setText(ticket.getDescription());

            // Status
            String status = ticket.getStatus();
            binding.statusChip.setText(status != null ? status : "Open");

            int statusColor = ticket.isOpen()
                    ? ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_pending)
                    : ContextCompat.getColor(binding.getRoot().getContext(), R.color.status_delivered);
            binding.statusChip.setChipBackgroundColor(ColorStateList.valueOf(statusColor));

            binding.getRoot().setOnClickListener(v -> {
                if (listener != null) {
                    listener.onTicketClick(ticket);
                }
            });
        }
    }
}
