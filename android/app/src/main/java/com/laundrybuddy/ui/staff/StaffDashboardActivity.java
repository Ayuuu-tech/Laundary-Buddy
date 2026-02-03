package com.laundrybuddy.ui.staff;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.ArrayAdapter;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.android.material.dialog.MaterialAlertDialogBuilder;
import com.laundrybuddy.LaundryBuddyApp;
import com.laundrybuddy.R;
import com.laundrybuddy.api.ApiClient;
import com.laundrybuddy.databinding.ActivityStaffDashboardBinding;
import com.laundrybuddy.databinding.DialogStaffTicketDetailBinding;
import com.laundrybuddy.models.ApiResponse;
import com.laundrybuddy.models.Order;
import com.laundrybuddy.models.SupportTicket;
import com.laundrybuddy.ui.auth.LoginActivity;
import com.laundrybuddy.ui.scanner.QrScannerActivity;
import com.laundrybuddy.ui.support.TicketAdapter;
import com.laundrybuddy.utils.ToastManager;

import com.laundrybuddy.repositories.OrderRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Staff Dashboard Activity for managing orders and tickets with QR scanning and
 * bulk operations
 */
public class StaffDashboardActivity extends AppCompatActivity {

    private static final String TAG = "StaffDashboardActivity";

    private ActivityStaffDashboardBinding binding;
    private OrderRepository repository;
    private StaffOrderAdapter orderAdapter;
    private TicketAdapter ticketAdapter;
    private List<Order> orders = new ArrayList<>();
    private List<Order> allOrders = new ArrayList<>();
    private List<SupportTicket> tickets = new ArrayList<>();
    private int currentTab = 0;

    // Pagination
    private int currentPage = 1;
    private int pageSize = 10;
    private int totalPages = 1;

    private final String[] STATUS_OPTIONS = {
            "pending", "received", "washing", "drying", "folding", "ready", "delivered", "cancelled"
    };

    private final String[] STATUS_DISPLAY = {
            "Pending", "Received", "Washing", "Drying", "Folding", "Ready", "Delivered", "Cancelled"
    };

    // QR Scanner launcher
    private final ActivityResultLauncher<Intent> qrScannerLauncher = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
                if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                    String scannedCode = result.getData().getStringExtra("scanned_code");
                    if (scannedCode != null && !scannedCode.isEmpty()) {
                        handleScannedOrder(scannedCode);
                    }
                }
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityStaffDashboardBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        repository = new OrderRepository(this);
        repository.getOrders().observe(this, newOrders -> {
            allOrders.clear();
            if (newOrders != null) {
                allOrders.addAll(newOrders);
            }
            updatePagedOrders();
            updatePaginationUI();

            if (binding != null && binding.swipeRefresh != null) {
                binding.swipeRefresh.setRefreshing(false);
                if (allOrders.isEmpty()) {
                    showEmptyState("No orders found");
                } else {
                    binding.emptyState.setVisibility(View.GONE);
                    binding.recyclerView.setVisibility(View.VISIBLE);
                }
            }
        });

        setupToolbar();
        setupRecyclerView();
        setupTabs();
        setupSwipeRefresh();
        setupFab();
        setupBulkActions();
        setupPagination();

        loadOrders();
    }

    private void setupToolbar() {
        binding.toolbar.setNavigationOnClickListener(v -> finish());
        binding.toolbar.setOnMenuItemClickListener(item -> {
            if (item.getItemId() == R.id.action_select) {
                toggleSelectionMode();
                return true;
            } else if (item.getItemId() == R.id.action_logout) {
                logout();
                return true;
            }
            return false;
        });
    }

    private void setupRecyclerView() {
        binding.recyclerView.setLayoutManager(new LinearLayoutManager(this));

        orderAdapter = new StaffOrderAdapter(orders,
                order -> showOrderStatusDialog(order),
                order -> {
                    orderAdapter.setSelectionMode(true);
                    orderAdapter.toggleSelection(order);
                    updateBulkActionBar();
                },
                (order, isPriority) -> updateOrderPriority(order, isPriority));

        ticketAdapter = new TicketAdapter(tickets, ticket -> {
            showTicketDetailDialog(ticket);
        });

        binding.recyclerView.setAdapter(orderAdapter);
    }

    private void setupTabs() {
        binding.tabLayout
                .addOnTabSelectedListener(new com.google.android.material.tabs.TabLayout.OnTabSelectedListener() {
                    @Override
                    public void onTabSelected(com.google.android.material.tabs.TabLayout.Tab tab) {
                        currentTab = tab.getPosition();
                        exitSelectionMode();
                        if (currentTab == 0) {
                            binding.recyclerView.setAdapter(orderAdapter);
                            binding.scanFab.setVisibility(View.VISIBLE);
                            loadOrders();
                        } else {
                            binding.recyclerView.setAdapter(ticketAdapter);
                            binding.scanFab.setVisibility(View.GONE);
                            loadTickets();
                        }
                    }

                    @Override
                    public void onTabUnselected(com.google.android.material.tabs.TabLayout.Tab tab) {
                    }

                    @Override
                    public void onTabReselected(com.google.android.material.tabs.TabLayout.Tab tab) {
                    }
                });
    }

    private void setupSwipeRefresh() {
        binding.swipeRefresh.setColorSchemeResources(R.color.primary);
        binding.swipeRefresh.setOnRefreshListener(() -> {
            if (currentTab == 0) {
                loadOrders();
            } else {
                loadTickets();
            }
        });
    }

    private void setupFab() {
        binding.scanFab.setOnClickListener(v -> {
            Intent intent = new Intent(this, QrScannerActivity.class);
            qrScannerLauncher.launch(intent);
        });
    }

    private void setupBulkActions() {
        binding.cancelSelectionBtn.setOnClickListener(v -> exitSelectionMode());

        binding.updateStatusBtn.setOnClickListener(v -> {
            List<Order> selectedOrders = orderAdapter.getSelectedOrders();
            if (!selectedOrders.isEmpty()) {
                showBulkStatusDialog(selectedOrders);
            }
        });
    }

    private void setupPagination() {
        binding.prevPageBtn.setOnClickListener(v -> {
            if (currentPage > 1) {
                currentPage--;
                updatePagedOrders();
            }
        });

        binding.nextPageBtn.setOnClickListener(v -> {
            if (currentPage < totalPages) {
                currentPage++;
                updatePagedOrders();
            }
        });
    }

    private void updatePagedOrders() {
        int startIndex = (currentPage - 1) * pageSize;
        int endIndex = Math.min(startIndex + pageSize, allOrders.size());

        orders.clear();
        if (startIndex < allOrders.size()) {
            orders.addAll(allOrders.subList(startIndex, endIndex));
        }
        orderAdapter.notifyDataSetChanged();
        updatePaginationUI();

        // Scroll to top
        binding.recyclerView.scrollToPosition(0);
    }

    private void updatePaginationUI() {
        totalPages = (int) Math.ceil((double) allOrders.size() / pageSize);
        if (totalPages == 0)
            totalPages = 1;

        binding.pageIndicator.setText("Page " + currentPage + " of " + totalPages);
        binding.prevPageBtn.setEnabled(currentPage > 1);
        binding.nextPageBtn.setEnabled(currentPage < totalPages);

        // Show pagination bar only if more than one page
        binding.paginationBar.setVisibility(totalPages > 1 ? View.VISIBLE : View.GONE);
    }

    private void toggleSelectionMode() {
        if (currentTab != 0)
            return; // Only for orders tab
        if (orderAdapter.isSelectionMode()) {
            exitSelectionMode();
        } else {
            orderAdapter.setSelectionMode(true);
            updateBulkActionBar();
        }
    }

    private void exitSelectionMode() {
        orderAdapter.setSelectionMode(false);
        binding.bulkActionBar.setVisibility(View.GONE);
    }

    private void updateBulkActionBar() {
        int count = orderAdapter.getSelectedCount();
        if (count > 0) {
            binding.bulkActionBar.setVisibility(View.VISIBLE);
            binding.selectedCount.setText(count + " selected");
        } else {
            binding.bulkActionBar.setVisibility(View.GONE);
        }
    }

    private void handleScannedOrder(String orderNumber) {
        // Find order by number
        for (Order order : orders) {
            if (orderNumber.equals(order.getOrderNumber())) {
                showOrderStatusDialog(order);
                return;
            }
        }
        ToastManager.showError(this, "Order #" + orderNumber + " not found");
    }

    private void showOrderStatusDialog(Order order) {
        int currentIndex = 0;
        for (int i = 0; i < STATUS_OPTIONS.length; i++) {
            if (STATUS_OPTIONS[i].equalsIgnoreCase(order.getStatus())) {
                currentIndex = i;
                break;
            }
        }

        new MaterialAlertDialogBuilder(this)
                .setTitle("Update Order #" + order.getOrderNumber())
                .setSingleChoiceItems(STATUS_DISPLAY, currentIndex, null)
                .setPositiveButton("Update", (dialog, which) -> {
                    int selectedIndex = ((AlertDialog) dialog).getListView().getCheckedItemPosition();
                    updateOrderStatus(order, STATUS_OPTIONS[selectedIndex]);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void showBulkStatusDialog(List<Order> selectedOrders) {
        new MaterialAlertDialogBuilder(this)
                .setTitle("Update " + selectedOrders.size() + " Orders")
                .setSingleChoiceItems(STATUS_DISPLAY, -1, null)
                .setPositiveButton("Update All", (dialog, which) -> {
                    int selectedIndex = ((AlertDialog) dialog).getListView().getCheckedItemPosition();
                    if (selectedIndex >= 0) {
                        bulkUpdateStatus(selectedOrders, STATUS_OPTIONS[selectedIndex]);
                    }
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void updateOrderStatus(Order order, String newStatus) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", newStatus);

        ApiClient.getInstance().getOrderApi().updateOrderStatus(order.getId(), body)
                .enqueue(new Callback<ApiResponse<Order>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<Order>> call, Response<ApiResponse<Order>> response) {
                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            ToastManager.showSuccess(StaffDashboardActivity.this, "Status updated!");
                            loadOrders();
                        } else {
                            ToastManager.showError(StaffDashboardActivity.this, "Update failed");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<Order>> call, Throwable t) {
                        Log.e(TAG, "Status update failed", t);
                        ToastManager.showError(StaffDashboardActivity.this, "Network error");
                    }
                });
    }

    private void bulkUpdateStatus(List<Order> selectedOrders, String newStatus) {
        int total = selectedOrders.size();
        int[] completed = { 0 };
        int[] failed = { 0 };

        for (Order order : selectedOrders) {
            Map<String, Object> body = new HashMap<>();
            body.put("status", newStatus);

            ApiClient.getInstance().getOrderApi().updateOrderStatus(order.getId(), body)
                    .enqueue(new Callback<ApiResponse<Order>>() {
                        @Override
                        public void onResponse(Call<ApiResponse<Order>> call, Response<ApiResponse<Order>> response) {
                            completed[0]++;
                            if (!response.isSuccessful() || response.body() == null || !response.body().isSuccess()) {
                                failed[0]++;
                            }
                            checkBulkComplete(total, completed[0], failed[0]);
                        }

                        @Override
                        public void onFailure(Call<ApiResponse<Order>> call, Throwable t) {
                            completed[0]++;
                            failed[0]++;
                            checkBulkComplete(total, completed[0], failed[0]);
                        }
                    });
        }
    }

    private void checkBulkComplete(int total, int completed, int failed) {
        if (completed == total) {
            exitSelectionMode();
            if (failed == 0) {
                ToastManager.showSuccess(this, "All " + total + " orders updated!");
            } else {
                ToastManager.showError(this, failed + " of " + total + " updates failed");
            }
            loadOrders();
        }
    }

    private void loadOrders() {
        if (repository != null) {
            repository.refreshOrders();
        } else {
            // Fallback or retry init
            repository = new OrderRepository(this);
            repository.refreshOrders();
        }
        if (binding != null) {
            binding.swipeRefresh.setRefreshing(true);
        }
    }

    private void loadTickets() {
        binding.loadingProgress.setVisibility(View.VISIBLE);
        binding.emptyState.setVisibility(View.GONE);

        ApiClient.getInstance().getSupportApi().getAllTickets()
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
                                    showEmptyState("No tickets found");
                                } else {
                                    binding.emptyState.setVisibility(View.GONE);
                                    binding.recyclerView.setVisibility(View.VISIBLE);
                                }
                            }
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<List<SupportTicket>>> call, Throwable t) {
                        binding.swipeRefresh.setRefreshing(false);
                        binding.loadingProgress.setVisibility(View.GONE);
                        Log.e(TAG, "Failed to load tickets", t);
                        showEmptyState("Failed to load tickets");
                    }
                });
    }

    private void updateStats() {
        int pending = 0;
        int inProgress = 0;
        int delivered = 0;

        for (Order order : orders) {
            String status = order.getStatus();
            if ("pending".equalsIgnoreCase(status)) {
                pending++;
            } else if ("delivered".equalsIgnoreCase(status)) {
                delivered++;
            } else if (!"cancelled".equalsIgnoreCase(status)) {
                inProgress++;
            }
        }

        binding.pendingCount.setText(String.valueOf(pending));
        binding.inProgressCount.setText(String.valueOf(inProgress));
        binding.deliveredCount.setText(String.valueOf(delivered));
    }

    private void showEmptyState(String message) {
        binding.emptyState.setVisibility(View.VISIBLE);
        binding.recyclerView.setVisibility(View.GONE);
        binding.emptyText.setText(message);
    }

    private void showTicketDetailDialog(SupportTicket ticket) {
        DialogStaffTicketDetailBinding dialogBinding = DialogStaffTicketDetailBinding.inflate(getLayoutInflater());

        // Populate fields
        dialogBinding.ticketSubject.setText(ticket.getSubject());
        String userInfo = "From: " + (ticket.getUserName() != null ? ticket.getUserName() : "User");
        if (ticket.getUserEmail() != null) {
            userInfo += " (" + ticket.getUserEmail() + ")";
        }
        dialogBinding.ticketUser.setText(userInfo);
        dialogBinding.ticketDescription.setText(ticket.getDescription());

        // Setup status spinner
        String[] statusOptions = { "open", "in_progress", "resolved", "closed" };
        String[] statusDisplay = { "Open", "In Progress", "Resolved", "Closed" };

        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, statusDisplay);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        dialogBinding.statusSpinner.setAdapter(adapter);

        int currentIndex = 0;
        for (int i = 0; i < statusOptions.length; i++) {
            if (statusOptions[i].equalsIgnoreCase(ticket.getStatus())) {
                currentIndex = i;
                break;
            }
        }
        dialogBinding.statusSpinner.setSelection(currentIndex);

        // Show previous response if exists
        if (ticket.getResponse() != null && !ticket.getResponse().isEmpty()) {
            dialogBinding.previousResponseContainer.setVisibility(View.VISIBLE);
            dialogBinding.previousResponse.setText(ticket.getResponse());
        }

        new com.google.android.material.dialog.MaterialAlertDialogBuilder(this)
                .setTitle("Ticket Details")
                .setView(dialogBinding.getRoot())
                .setPositiveButton("Update", (dialog, which) -> {
                    String newStatus = statusOptions[dialogBinding.statusSpinner.getSelectedItemPosition()];
                    String response = dialogBinding.responseInput.getText() != null
                            ? dialogBinding.responseInput.getText().toString().trim()
                            : "";

                    updateTicketStatus(ticket, newStatus, response);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void updateTicketStatus(SupportTicket ticket, String newStatus, String response) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", newStatus);
        if (!response.isEmpty()) {
            body.put("response", response);
        }

        ApiClient.getInstance().getSupportApi().updateTicket(ticket.getId(), body)
                .enqueue(new Callback<ApiResponse<SupportTicket>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<SupportTicket>> call,
                            Response<ApiResponse<SupportTicket>> response) {
                        if (response.isSuccessful() && response.body() != null && response.body().isSuccess()) {
                            ToastManager.showSuccess(StaffDashboardActivity.this, "Ticket updated successfully");
                            loadTickets();
                        } else {
                            ToastManager.showError(StaffDashboardActivity.this, "Failed to update ticket");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<SupportTicket>> call, Throwable t) {
                        Log.e(TAG, "Failed to update ticket", t);
                        ToastManager.showError(StaffDashboardActivity.this, "Failed to update ticket");
                    }
                });
    }

    private void updateOrderPriority(Order order, boolean isPriority) {
        Map<String, Object> body = new HashMap<>();
        body.put("isPriority", isPriority);

        ApiClient.getInstance().getOrderApi().updateOrder(order.getId(), body)
                .enqueue(new Callback<ApiResponse<Order>>() {
                    @Override
                    public void onResponse(Call<ApiResponse<Order>> call, Response<ApiResponse<Order>> response) {
                        if (response.isSuccessful() && response.body() != null) {
                            // Success - UI already updated by adapter
                        } else {
                            ToastManager.showError(StaffDashboardActivity.this, "Failed to update priority");
                        }
                    }

                    @Override
                    public void onFailure(Call<ApiResponse<Order>> call, Throwable t) {
                        Log.e(TAG, "Failed to update priority", t);
                        ToastManager.showError(StaffDashboardActivity.this, "Failed to update priority");
                    }
                });
    }

    private void logout() {
        ApiClient.getInstance().getAuthApi().logout().enqueue(new Callback<ApiResponse<Void>>() {
            @Override
            public void onResponse(Call<ApiResponse<Void>> call, Response<ApiResponse<Void>> response) {
                performLogout();
            }

            @Override
            public void onFailure(Call<ApiResponse<Void>> call, Throwable t) {
                performLogout();
            }
        });
    }

    private void performLogout() {
        LaundryBuddyApp.getInstance().clearAuth();
        Intent intent = new Intent(this, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }

    @Override
    public void onBackPressed() {
        if (orderAdapter.isSelectionMode()) {
            exitSelectionMode();
        } else {
            super.onBackPressed();
        }
    }
}
