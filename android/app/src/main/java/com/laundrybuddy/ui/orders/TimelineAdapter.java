package com.laundrybuddy.ui.orders;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.laundrybuddy.R;
import com.laundrybuddy.databinding.ItemTimelineStepBinding;

import java.util.List;

/**
 * Adapter for displaying order status timeline
 */
public class TimelineAdapter extends RecyclerView.Adapter<TimelineAdapter.TimelineViewHolder> {

    private final List<TimelineStep> steps;

    public TimelineAdapter(List<TimelineStep> steps) {
        this.steps = steps;
    }

    @NonNull
    @Override
    public TimelineViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        ItemTimelineStepBinding binding = ItemTimelineStepBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false);
        return new TimelineViewHolder(binding);
    }

    @Override
    public void onBindViewHolder(@NonNull TimelineViewHolder holder, int position) {
        TimelineStep step = steps.get(position);
        boolean isFirst = position == 0;
        boolean isLast = position == steps.size() - 1;
        holder.bind(step, isFirst, isLast);
    }

    @Override
    public int getItemCount() {
        return steps.size();
    }

    /**
     * Model class for a timeline step
     */
    public static class TimelineStep {
        public final String status;
        public final String label;
        public final String time;
        public final boolean isCompleted;
        public final boolean isCurrent;

        public TimelineStep(String status, String label, String time, boolean isCompleted, boolean isCurrent) {
            this.status = status;
            this.label = label;
            this.time = time;
            this.isCompleted = isCompleted;
            this.isCurrent = isCurrent;
        }
    }

    static class TimelineViewHolder extends RecyclerView.ViewHolder {
        private final ItemTimelineStepBinding binding;

        TimelineViewHolder(ItemTimelineStepBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        void bind(TimelineStep step, boolean isFirst, boolean isLast) {
            binding.statusLabel.setText(step.label);

            // Show time for completed and current steps
            if (step.isCompleted || step.isCurrent) {
                binding.statusTime.setVisibility(View.VISIBLE);
                binding.statusTime.setText(step.time != null ? step.time : "");
            } else {
                binding.statusTime.setVisibility(View.GONE);
            }

            // Style based on completion status
            if (step.isCompleted) {
                binding.statusCircle.setBackgroundResource(R.drawable.timeline_circle_completed);
                binding.checkIcon.setVisibility(View.VISIBLE);
                binding.statusLabel.setTextColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.text_primary));
                binding.topLine.setBackgroundColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.primary));
                binding.bottomLine.setBackgroundColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.primary));
            } else if (step.isCurrent) {
                binding.statusCircle.setBackgroundResource(R.drawable.timeline_circle_completed);
                binding.checkIcon.setVisibility(View.GONE);
                binding.statusLabel.setTextColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.primary));
                binding.statusLabel.setTextSize(16);
                binding.topLine.setBackgroundColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.primary));
                binding.bottomLine.setBackgroundColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.divider));
            } else {
                binding.statusCircle.setBackgroundResource(R.drawable.timeline_circle_pending);
                binding.checkIcon.setVisibility(View.GONE);
                binding.statusLabel.setTextColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.text_hint));
                binding.topLine.setBackgroundColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.divider));
                binding.bottomLine.setBackgroundColor(ContextCompat.getColor(
                        binding.getRoot().getContext(), R.color.divider));
            }

            // Hide lines at ends
            binding.topLine.setVisibility(isFirst ? View.INVISIBLE : View.VISIBLE);
            binding.bottomLine.setVisibility(isLast ? View.INVISIBLE : View.VISIBLE);
        }
    }
}
