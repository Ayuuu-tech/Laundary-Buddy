package com.laundrybuddy.ui.support;

import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
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

    private String currentCategory = "General";
    private List<com.laundrybuddy.models.Order> orderList = new ArrayList<>();
    private com.laundrybuddy.models.Order selectedOrder = null;

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        super.onViewCreated(view, savedInstanceState);

        setupRecyclerView();
        setupClickListeners();

        loadTickets();
        loadOrdersForDropdown();
    }

    private void setupRecyclerView() {
        ticketAdapter = new TicketAdapter(tickets, this::showTicketDetails);
        binding.ticketsRecycler
                .setLayoutManager(new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false));
        binding.ticketsRecycler.setAdapter(ticketAdapter);
    }

    private void showTicketDetails(com.laundrybuddy.models.SupportTicket ticket) {
        android.app.AlertDialog.Builder builder = new android.app.AlertDialog.Builder(requireContext());
        View view = LayoutInflater.from(getContext()).inflate(R.layout.dialog_ticket_detail, null);
        builder.setView(view);

        android.app.AlertDialog dialog = builder.create();
        dialog.getWindow().setBackgroundDrawableResource(android.R.color.transparent);

        TextView category = view.findViewById(R.id.dialogCategory);
        TextView status = view.findViewById(R.id.dialogStatus);
        TextView orderNum = view.findViewById(R.id.dialogOrderNumber);
        TextView desc = view.findViewById(R.id.dialogDescription);
        TextView responseText = view.findViewById(R.id.dialogResponse);
        View responseContainer = view.findViewById(R.id.responseContainer);
        View btnClose = view.findViewById(R.id.btnClose);

        category.setText(ticket.getCategory());
        status.setText(ticket.getStatus());
        orderNum.setText(ticket.getOrderNumber());
        desc.setText(ticket.getDescription());

        // Apply dynamic status color
        int statusColor = getTicketStatusColor(ticket.getStatus());
        status.setTextColor(statusColor);

        if (ticket.getResponse() != null && !ticket.getResponse().isEmpty()) {
            responseContainer.setVisibility(View.VISIBLE);
            responseText.setText(ticket.getResponse());
        } else {
            responseContainer.setVisibility(View.GONE);
        }

        btnClose.setOnClickListener(v -> dialog.dismiss());

        dialog.show();
    }

    private int getTicketStatusColor(String status) {
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

    private void setupClickListeners() {
        binding.btnReportMissing.setOnClickListener(v -> showReportForm("Missing Clothes"));
        binding.btnReportDamage.setOnClickListener(v -> showReportForm("Damage"));

        binding.cancelReportButton.setOnClickListener(v -> {
            binding.reportFormContainer.setVisibility(View.GONE);
            resetForm();
        });

        binding.submitReportButton.setOnClickListener(v -> submitReport());

        binding.btnGenerateMonthly.setOnClickListener(v -> generateMonthlyReport());
        binding.btnExportHistory.setOnClickListener(v -> exportData());
    }

    private void exportData() {
        if (orderList == null || orderList.isEmpty()) {
            Toast.makeText(getContext(), "No data to export", Toast.LENGTH_SHORT).show();
            // Trigger load just in case
            loadOrdersForDropdown();
            return;
        }

        try {
            java.io.File file = new java.io.File(requireContext().getExternalFilesDir(null), "laundry_history.csv");
            java.io.FileWriter writer = new java.io.FileWriter(file);
            writer.append("Order Number,Status,Item Count,Date\n");

            for (com.laundrybuddy.models.Order order : orderList) {
                writer.append(order.getOrderNumber()).append(",");
                writer.append(order.getStatus()).append(",");
                writer.append(String.valueOf(order.getTotalItems())).append(",");
                writer.append(order.getCreatedAt()).append("\n");
            }
            writer.flush();
            writer.close();

            // Share Intent
            android.net.Uri uri = androidx.core.content.FileProvider.getUriForFile(requireContext(),
                    requireContext().getPackageName() + ".fileprovider", file);

            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_SEND);
            intent.setType("text/csv");
            intent.putExtra(android.content.Intent.EXTRA_STREAM, uri);
            intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(android.content.Intent.createChooser(intent, "Export History"));

        } catch (Exception e) {
            Toast.makeText(getContext(), "Export failed: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            android.util.Log.e(TAG, "Export error", e);
        }
    }

    private void generateMonthlyReport() {
        if (orderList == null || orderList.isEmpty()) {
            Toast.makeText(getContext(), "No orders found to generate report", Toast.LENGTH_SHORT).show();
            // Trigger load just in case
            loadOrdersForDropdown();
            return;
        }

        int totalOrders = 0;
        int totalClothes = 0;
        int pendingOrders = 0;

        java.util.Calendar cal = java.util.Calendar.getInstance();
        int currentMonth = cal.get(java.util.Calendar.MONTH);
        int currentYear = cal.get(java.util.Calendar.YEAR);

        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US);

        for (com.laundrybuddy.models.Order order : orderList) {
            try {
                if (order.getCreatedAt() != null) {
                    java.util.Date date = sdf.parse(order.getCreatedAt()); // Assumes ISO starts with YYYY-MM-DD
                    if (date != null) {
                        cal.setTime(date);
                        if (cal.get(java.util.Calendar.MONTH) == currentMonth &&
                                cal.get(java.util.Calendar.YEAR) == currentYear) {

                            totalOrders++;
                            totalClothes += order.getTotalItems();
                            if (!order.isDelivered() && !"cancelled".equalsIgnoreCase(order.getStatus())) {
                                pendingOrders++;
                            }
                        }
                    }
                }
            } catch (Exception e) {
                // Ignore parsing errors, count all or skip
            }
        }

        String report = "Summary for "
                + new java.text.SimpleDateFormat("MMMM yyyy", java.util.Locale.US).format(new java.util.Date()) + "\n\n"
                +
                "Orders Placed: " + totalOrders + "\n" +
                "Clothes Washed: " + totalClothes + "\n" +
                "Pending Orders: " + pendingOrders + "\n\n" +
                "Status: " + (pendingOrders > 0 ? "Active" : "All Clear");

        new MaterialAlertDialogBuilder(requireContext())
                .setTitle("Monthly Report")
                .setMessage(report)
                .setPositiveButton("OK", null)
                .show();
    }

    private void showReportForm(String category) {
        currentCategory = category;
        binding.formTitle.setText("Report " + category);
        binding.reportFormContainer.setVisibility(View.VISIBLE);

        // Smooth scroll to form
        binding.getRoot().post(() -> {
            binding.getRoot().smoothScrollTo(0, binding.reportFormContainer.getTop());
        });
    }

    private void resetForm() {
        binding.issueDescriptionInput.setText("");
        binding.orderSelector.setText("");
        binding.selectedOrderDetails.setVisibility(View.GONE);
        selectedOrder = null;
    }

    private void loadOrdersForDropdown() {
        ApiClient.getInstance().getOrderApi().getMyOrders()
                .enqueue(new Callback<ApiResponse<List<com.laundrybuddy.models.Order>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<com.laundrybuddy.models.Order>>> call,
                            Response<ApiResponse<List<com.laundrybuddy.models.Order>>> response) {
                        if (!isAdded() || binding == null)
                            return;
                        if (response.isSuccessful() && response.body() != null && response.body().getData() != null) {
                            orderList = response.body().getData();
                            setupOrderDropdown();
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<com.laundrybuddy.models.Order>>> call, Throwable t) {
                        if (!isAdded() || binding == null)
                            return;
                        Log.e(TAG, "Failed to load orders", t);
                    }
                });
    }

    private void setupOrderDropdown() {
        List<com.laundrybuddy.models.Order> eligibleOrders = new ArrayList<>();
        List<String> orderDisplays = new ArrayList<>();
        for (com.laundrybuddy.models.Order order : orderList) {
            if (order.isDelivered()) {
                eligibleOrders.add(order);
                String label = "Order " + order.getOrderNumber() + " (" + order.getTotalItems() + " items) - "
                        + order.getStatusDisplay();
                orderDisplays.add(label);
            }
        }

        if (eligibleOrders.isEmpty() && !orderList.isEmpty()) {
            Toast.makeText(getContext(), "No delivered orders found. Only delivered orders can be reported.",
                    Toast.LENGTH_LONG).show();
        }

        android.widget.ArrayAdapter<String> adapter = new android.widget.ArrayAdapter<>(
                requireContext(), android.R.layout.simple_dropdown_item_1line, orderDisplays);

        ((android.widget.AutoCompleteTextView) binding.orderSelector).setAdapter(adapter);
        ((android.widget.AutoCompleteTextView) binding.orderSelector)
                .setOnItemClickListener((parent, view, position, id) -> {
                    if (position >= 0 && position < eligibleOrders.size()) {
                        selectedOrder = eligibleOrders.get(position);

                        String dateStr = selectedOrder.getCreatedAt();
                        try {
                            String formatPattern = dateStr.length() > 20 ? "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
                                    : "yyyy-MM-dd";
                            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat(formatPattern,
                                    java.util.Locale.US);
                            if (dateStr.endsWith("Z")) {
                                sdf.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
                            }
                            java.util.Date date = sdf.parse(dateStr);

                            java.text.SimpleDateFormat displayFormat = new java.text.SimpleDateFormat(
                                    "MMM dd, yyyy 'at' hh:mm a", java.util.Locale.US);
                            binding.selectedOrderDetails.setText("Ordered on: " + displayFormat.format(date));
                        } catch (Exception e) {
                            binding.selectedOrderDetails.setText("Ordered on: " + dateStr);
                        }
                        binding.selectedOrderDetails.setVisibility(View.VISIBLE);
                    }
                });
    }

    private void submitReport() {
        String description = binding.issueDescriptionInput.getText().toString().trim();

        if (description.isEmpty()) {
            Toast.makeText(getContext(), "Please describe the issue", Toast.LENGTH_SHORT).show();
            return;
        }

        if (description.length() < 10) {
            Toast.makeText(getContext(), "Description must be at least 10 characters", Toast.LENGTH_SHORT).show();
            return;
        }

        if (selectedOrder == null) {
            Toast.makeText(getContext(), "Please select an order", Toast.LENGTH_SHORT).show();
            return;
        }

        createTicket(selectedOrder, description, currentCategory);
    }

    private void createTicket(com.laundrybuddy.models.Order order, String description, String category) {
        Map<String, Object> body = new HashMap<>();
        body.put("orderId", order.getId());
        body.put("orderNumber", order.getOrderNumber());

        // Map category to backend enum: 'missing-clothes', 'damage', 'contact'
        String type = "contact";
        if (category != null) {
            if (category.contains("Missing"))
                type = "missing-clothes";
            else if (category.contains("Damage"))
                type = "damage";
        }
        body.put("type", type);

        // Backend requires 'items' string. We'll use description.
        body.put("items", description);
        body.put("details", description);

        // Optional damageType if type is damage. Not implemented in UI yet, defaulting
        // to null or generic.
        if ("damage".equals(type)) {
            body.put("damageType", "General Damage");
        }

        binding.loadingProgress.setVisibility(View.VISIBLE);

        ApiClient.getInstance().getSupportApi().createTicket(body).enqueue(new Callback<ApiResponse<SupportTicket>>() {
            @Override
            public void onResponse(Call<ApiResponse<SupportTicket>> call,
                    Response<ApiResponse<SupportTicket>> response) {
                if (!isAdded() || binding == null)
                    return;
                binding.loadingProgress.setVisibility(View.GONE);
                if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                    Toast.makeText(getContext(), getString(R.string.ticket_created), Toast.LENGTH_SHORT).show();
                    binding.reportFormContainer.setVisibility(View.GONE);
                    resetForm();
                    loadTickets();
                } else {
                    String errorMsg = "Failed to create ticket";
                    if (response.code() == 400) {
                        errorMsg += ": Valid details required.";
                    }
                    Toast.makeText(getContext(), errorMsg + " (" + response.message() + ")", Toast.LENGTH_LONG).show();
                    Log.e(TAG, "Ticket creation failed. Code: " + response.code() + ", Msg: " + response.message());
                }
            }

            @Override
            public void onFailure(Call<ApiResponse<SupportTicket>> call, Throwable t) {
                if (!isAdded() || binding == null)
                    return;
                binding.loadingProgress.setVisibility(View.GONE);
                Log.e(TAG, "Failed to create ticket", t);
                Toast.makeText(getContext(), getString(R.string.error_network), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void loadTickets() {
        // binding.loadingProgress.setVisibility(View.VISIBLE); // Don't block whole UI
        binding.noTicketsText.setVisibility(View.GONE);

        ApiClient.getInstance().getSupportApi().getMyTickets()
                .enqueue(new Callback<ApiResponse<List<SupportTicket>>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<List<SupportTicket>>> call,
                            Response<ApiResponse<List<SupportTicket>>> response) {
                        if (!isAdded() || binding == null)
                            return;
                        // binding.swipeRefresh.setRefreshing(false);
                        // binding.loadingProgress.setVisibility(View.GONE);

                        if (response.isSuccessful() && response.body() != null) {
                            ApiResponse<List<SupportTicket>> apiResponse = response.body();
                            if (apiResponse.isSuccess() && apiResponse.getData() != null) {
                                tickets.clear();
                                tickets.addAll(apiResponse.getData());
                                ticketAdapter.notifyDataSetChanged();

                                if (tickets.isEmpty()) {
                                    binding.noTicketsText.setVisibility(View.VISIBLE);
                                    binding.ticketsRecycler.setVisibility(View.GONE);
                                } else {
                                    binding.noTicketsText.setVisibility(View.GONE);
                                    binding.ticketsRecycler.setVisibility(View.VISIBLE);
                                }
                            }
                        } else {
                            binding.noTicketsText.setVisibility(View.VISIBLE);
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<SupportTicket>>> call, Throwable t) {
                        if (!isAdded() || binding == null)
                            return;
                        Log.e(TAG, "Failed to load tickets", t);
                        // Show error or just leave empty state
                    }
                });
    }

    private void showEmptyState() {
        // Deprecated / unused now as we have noTicketsText
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        binding = null;
    }

}
