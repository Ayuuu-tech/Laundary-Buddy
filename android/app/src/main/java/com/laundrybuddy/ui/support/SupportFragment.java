package com.laundrybuddy.ui.support;

import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.google.android.material.textfield.TextInputEditText;
import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.FragmentSupportBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.SupportTicket;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Support Fragment for managing support tickets
 */
public class SupportFragment extends Fragment {

    private static final String TAG = "SupportFragment";

    private FragmentSupportBinding binding;
    private TicketAdapter ticketAdapter;
    private List<SupportTicket> tickets = new ArrayList<>();

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        binding = FragmentSupportBinding.inflate(inflater, container, false);
        return binding.getRoot();
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        setupRecyclerView();
        setupClickListeners();
        setupSwipeRefresh();

        loadTickets();
    }

    private void setupRecyclerView() {
        ticketAdapter = new TicketAdapter(tickets, ticket -> {
            Toast.makeText(getContext(), "Ticket: " + ticket.getSubject(), Toast.LENGTH_SHORT).show();
        });

        binding.ticketsRecycler.setLayoutManager(new LinearLayoutManager(getContext()));
        binding.ticketsRecycler.setAdapter(ticketAdapter);
    }

    private void setupClickListeners() {
        binding.createTicketButton.setOnClickListener(v -> showCreateTicketDialog());
    }

    private void setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeResources(R.color.primary);
        binding.swipeRefresh.setOnRefreshListener(this::loadTickets);
    }

    private void showCreateTicketDialog() {
        View dialogView = LayoutInflater.from(getContext()).inflate(R.layout.dialog_create_ticket, null);

        TextInputEditText subjectInput = dialogView.findViewById(R.id.subjectInput);
        TextInputEditText descriptionInput = dialogView.findViewById(R.id.descriptionInput);

        new MaterialAlertDialogBuilder(requireContext())
                .setTitle(getString(R.string.create_ticket))
                .setView(dialogView)
                .setPositiveButton("Submit", (dialog, which) -> {
                    String subject = subjectInput.getText().toString().trim();
                    String description = descriptionInput.getText().toString().trim();

                    if (!subject.isEmpty() && !description.isEmpty()) {
                        createTicket(subject, description);
                    } else {
                        Toast.makeText(getContext(), "Please fill all fields", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton(getString(R.string.cancel), null)
                .show();
    }

    private void createTicket(String subject, String description) {
        Map<String, Object> body = new HashMap<>();
        body.put("subject", subject);
        body.put("description", description);
        body.put("category", "general");
        body.put("priority", "medium");

        ApiClient.getInstance().getSupportApi().createTicket(body).enqueue(new Callback<ApiResponse<SupportTicket>>() {
            @Override
            public void onResponse(Call<ApiResponse<SupportTicket>> call,
                    Response<ApiResponse<SupportTicket>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Toast.makeText(getContext(), getString(R.string.ticket_created), Toast.LENGTH_SHORT).show();
                    loadTickets();
                } else {
                    Toast.makeText(getContext(), "Failed to create ticket", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<SupportTicket>> call, Throwable t) {
                Log.e(TAG, "Failed to create ticket", t);
                Toast.makeText(getContext(), getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void loadTickets() {
        binding.loadingProgress.setVisibility(View.VISIBLE);
        binding.emptyState.setVisibility(View.GONE);

        ApiClient.getInstance().getSupportApi().getMyTickets()
                .enqueue(new Callback<ApiResponse<List<SupportTicket>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<SupportTicket>>> call,
                            Response<ApiResponse<List<SupportTicket>>> response) {
                        binding.swipeRefresh.setRefreshing(false);
                        binding.loadingProgress.setVisibility(View.GONE);

                        if (response.isSuccessful() && response.body() != null) {
                            ApiResponse<List<SupportTicket>> apiResponse = response.body();
                            if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                                tickets.clear();
                                tickets.addAll(apiResponse.getData());
                                ticketAdapter.notifyDataSetChanged();

                                if (tickets.isEmpty()) {
                                    showEmptyState();
                                } else {
                                    binding.emptyState.setVisibility(View.GONE);
                                    binding.ticketsRecycler.setVisibility(View.VISIBLE);
                                }
                            }
                        } else {
                            showEmptyState();
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<SupportTicket>>> call, Throwable t) {
                        binding.swipeRefresh.setRefreshing(false);
                        binding.loadingProgress.setVisibility(View.GONE);
                        Log.e(TAG, "Failed to load tickets", t);
                        showEmptyState();
                    }
                });
    }

    private void showEmptyState() {
        binding.emptyState.setVisibility(View.VISIBLE);
        binding.ticketsRecycler.setVisibility(View.GONE);
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }
}
